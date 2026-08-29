import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { getTranslations } from 'next-intl/server';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import Link from 'next/link';
import { ReservationCalendar } from '@/components/dashboard/ReservationCalendar';
import { DashboardHeaderActions } from '@/components/dashboard/DashboardHeaderActions';
import { SuperadminBanner } from '@/components/dashboard/SuperadminBanner';
import { getIndustryConfig } from '@/lib/industries';
import { isCentralApiEnabled, resolveCentralTenantBySlug, getCentralBranchReservations } from '@/lib/central-api';


export default async function TenantDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { slug, locale } = await params;
  const { view = 'calendar' } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const userId = (session.user as { id: string }).id;
  const userRole = (session.user as { role?: string }).role;
  const isSuperAdmin = userRole === 'PLATFORM_ADMIN';

  let tenant: any = null;
  let centralBranchId: string | null = null;

  if (isCentralApiEnabled()) {
    const central = await resolveCentralTenantBySlug(slug);
    if (central) {
      tenant = {
        id: central.business.id,
        slug: central.business.slug,
        name: central.business.name,
        industry: central.business.industry || 'RESTAURANTE',
        dbUrl: '',
        owner: { email: session.user.email, name: session.user.name },
      };
      centralBranchId = central.branch.id;
    }
  }

  if (!tenant && !isCentralApiEnabled()) {
    try {
      tenant = await prismaControl.tenant.findUnique({
        where: { slug },
        include: { owner: { select: { email: true, name: true } } },
      });
    } catch {
      tenant = null;
    }
  }

  if (!tenant) notFound();

  const config = getIndustryConfig(tenant.industry);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const startRange = addDays(todayStart, -30);
  const endRange = addDays(todayStart, 90);

  let today: any[] = [];
  let calendarReservations: any[] = [];
  let servicesCount = 0;
  let customersCount = 0;

  if (isCentralApiEnabled() && centralBranchId && (session as any).accessToken) {
    try {
      const centralBookings = await getCentralBranchReservations(centralBranchId, (session as any).accessToken);
      calendarReservations = centralBookings.map((b) => ({
        id: b.id,
        startsAt: new Date(b.startsAt),
        endsAt: new Date(b.endsAt),
        status: b.status,
        notes: b.notes,
        customer: {
          name: b.customerName,
          email: b.customerEmail,
          phone: b.customerPhone,
        },
        service: { name: b.serviceName || 'Servicio' },
        resource: b.resourceName ? { name: b.resourceName } : null,
        staff: b.staffName ? { name: b.staffName } : null,
      }));

      today = calendarReservations.filter(
        (r) => r.startsAt >= todayStart && r.startsAt <= todayEnd
      );
      servicesCount = 1;
      customersCount = new Set(centralBookings.map((b) => b.customerEmail || b.customerName)).size;
    } catch (err) {
      console.warn('[DashboardPage] Warning: Error fetching Central API data:', err);
    }
  } else if (tenant.dbUrl) {
    try {
      const db = getTenantClient(tenant.dbUrl);
      [today, calendarReservations, servicesCount, customersCount] = await Promise.all([
        db.reservation.findMany({
          where: { startsAt: { gte: todayStart, lte: todayEnd } },
          orderBy: { startsAt: 'asc' },
          include: { customer: true, service: true, resource: true, staff: true },
        }),
        db.reservation.findMany({
          where: { startsAt: { gte: startRange, lte: endRange } },
          orderBy: { startsAt: 'asc' },
          include: { customer: true, service: true, resource: true, staff: true },
        }),
        db.service.count({ where: { active: true } }),
        db.customer.count(),
      ]);
    } catch (err) {
      console.error(`[DashboardPage] Warning: Could not fetch DB data for ${slug}:`, err);
    }
  }



  const events = calendarReservations.map((r: any) => ({
    id: r.id,
    title: `${r.customer.name} - ${r.service.name}`,
    start: r.startsAt,
    end: r.endsAt,
    status: r.status,
    customerName: r.customer.name,
    customerEmail: r.customer.email,
    customerPhone: r.customer.phone,
    serviceName: r.service.name,
    resourceName: r.resource?.name ?? null,
    staffName: r.staff?.name ?? null,
    notes: r.notes,
  }));

  const t = await getTranslations('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {isSuperAdmin && (
          <SuperadminBanner
            tenantName={tenant.name}
            tenantSlug={slug}
            ownerEmail={tenant.owner?.email}
            locale={locale}
          />
        )}

        {/* ── Header ─────────────────────────────────────────── */}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{tenant.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Panel de administración de tu negocio</p>
          </div>
          <DashboardHeaderActions slug={slug} locale={locale} />
        </div>

        {/* ── 30-Day Free Trial Banner ────────────────────────────── */}

        {tenant.isTrial && tenant.trialEndsAt && (
          <div className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/90 dark:bg-emerald-950/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div>
                <p className="font-bold text-sm">
                  Prueba Gratuita de Demo Activa (30 Días)
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Quedan {Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} días restantes de acceso completo sin comisiones.
                </p>
              </div>
            </div>
            <a
              href="https://wa.me/593994916012?text=Hola,%20quisiera%20activar%20mi%20Plan%20Pro%20para%20mi%20negocio"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 transition shadow-sm shrink-0"
            >
              🚀 Activar Plan Pro
            </a>
          </div>
        )}

        {/* ── Quick Nav ──────────────────────────────────────── */}

        <nav className="mt-6 flex flex-wrap gap-2">
          {[
            { href: `/${locale}/dashboard/${slug}?view=calendar`, label: config.bookingMode === 'NIGHTLY' ? '📅 Estancias' : '📅 Reservas & Citas' },
            { href: `/${locale}/dashboard/${slug}/servicios`, label: config.serviceTitle },
            { href: `/${locale}/dashboard/${slug}/personal`, label: `👥 ${config.staffLabel.plural}` },
            { href: `/${locale}/dashboard/${slug}/recursos`, label: `🔑 ${config.resourceLabel.plural}` },
            { href: `/${locale}/dashboard/[slug]/clientes`.replace('[slug]', slug), label: `👤 ${config.customerLabel.plural}` },
            { href: `/${locale}/dashboard/${slug}/estadisticas`, label: '📊 Estadísticas' },
            { href: `/${locale}/dashboard/${slug}/perfil`, label: '⚙️ Perfil' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* ── View switcher for reservations ────────────────── */}
        <div className="mt-6 flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-900">
            <Link
              href={`/${locale}/dashboard/${slug}?view=calendar`}
              className={`px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition ${
                view === 'calendar'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Calendario
            </Link>
            <Link
              href={`/${locale}/dashboard/${slug}?view=list`}
              className={`px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition ${
                view === 'list'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Lista
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <Stat label={t('todayReservations')} value={today.length} />
          <Stat label={t('services')} value={servicesCount} />
          <Stat label={t('customers')} value={customersCount} />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-4">
          <div className="lg:col-span-3">
            {view === 'calendar' ? (
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">{t('calendar')}</h2>
                <ReservationCalendar slug={slug} initialEvents={events} locale={locale} />
              </div>
            ) : (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('todayReservations')}</h2>
                  {today.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 italic">No hay reservas programadas para hoy.</p>
                  ) : (
                    <ReservationsTable rows={today} locale={locale} />
                  )}
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Próximas Reservas</h2>
                  {calendarReservations.filter(r => r.startsAt > todayEnd).length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 italic">No hay reservas programadas próximas.</p>
                  ) : (
                    <ReservationsTable 
                      rows={calendarReservations.filter(r => r.startsAt > todayEnd).slice(0, 15)} 
                      locale={locale} 
                    />
                  )}
                </section>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                {tenant.logoUrl ? (
                  <img
                    src={tenant.logoUrl}
                    alt={tenant.name}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-100 dark:border-slate-800"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 flex items-center justify-center text-2xl">
                    🏪
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-tight">{tenant.name}</h3>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium capitalize">
                    {tenant.industry.toLowerCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-sm">
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Plan & Límites del Negocio</span>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs border font-black ${
                      tenant.plan === 'BUSINESS'
                        ? 'bg-purple-950/80 border-purple-500/40 text-purple-300'
                        : tenant.plan === 'PRO'
                        ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}>
                      {tenant.plan === 'BUSINESS' ? '🚀 BUSINESS' : tenant.plan === 'PRO' ? '⭐ PRO' : 'FREE'}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                      tenant.status === 'ACTIVE'
                        ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-950/80 border border-amber-500/40 text-amber-300'
                    }`}>
                      {tenant.status === 'ACTIVE' ? 'Activo' : tenant.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-400 bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                    <div className="flex justify-between">
                      <span>Servicios permitidos:</span>
                      <strong className="text-white font-bold">{servicesCount} / {tenant.plan === 'BUSINESS' ? '∞' : tenant.plan === 'PRO' ? '15' : '3'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Límite mensual reservas:</span>
                      <strong className="text-white font-bold">{today.length} / {tenant.plan === 'BUSINESS' ? '∞' : tenant.plan === 'PRO' ? '300' : '30'}</strong>
                    </div>
                  </div>
                </div>

                {tenant.phone && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase block">Contacto</span>
                    <a href={`tel:${tenant.phone}`} className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">
                      📞 {tenant.phone}
                    </a>
                  </div>
                )}

                {(tenant.provincia || tenant.canton || tenant.parroquia || (tenant as any).comuna || tenant.address) && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase block">Ubicación</span>
                    <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                      {[(tenant as any).comuna ? `Comuna ${(tenant as any).comuna}` : null, tenant.parroquia, tenant.canton, tenant.provincia].filter(Boolean).join(', ')}
                    </p>

                    {tenant.address && (
                      <p className="text-slate-700 dark:text-slate-300 font-medium mt-1">📍 {tenant.address}</p>
                    )}
                    {tenant.lat && tenant.lng && (
                      <a
                        href={`https://www.google.com/maps?q=${tenant.lat},${tenant.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1 inline-block"
                      >
                        🗺 Ver en Google Maps
                      </a>
                    )}
                  </div>
                )}

                {tenant.description && (
                  <div className="pt-2 border-t border-slate-50 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-400 uppercase block">Descripción</span>
                    <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed italic">
                      &quot;{tenant.description}&quot;
                    </p>

                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href={`/${locale}/dashboard/${slug}/perfil`}
                  className="w-full text-center block text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900 py-2.5 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800/60"
                >
                  ⚙️ Editar Información
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-slate-950 dark:text-slate-100">{value}</div>
    </div>
  );
}

function ReservationsTable({
  rows,
  locale,
}: {
  rows: Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    customer: { name: string };
    service: { name: string };
    resource: { name: string } | null;
    staff: { name: string } | null;
  }>;
  locale: string;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="px-4 py-3">Fecha y Hora</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Servicio</th>
            <th className="px-4 py-3">Recurso</th>
            <th className="px-4 py-3">Personal</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                {r.startsAt.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}
              </td>
              <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{r.customer.name}</td>
              <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium">{r.service.name}</td>
              <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{r.resource?.name ?? '—'}</td>
              <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{r.staff?.name ?? '—'}</td>
              <td className="px-4 py-3.5">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    r.status === 'CONFIRMED'
                      ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                      : r.status === 'PENDING'
                      ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                      : r.status === 'COMPLETED'
                      ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300'
                  }`}
                >
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
