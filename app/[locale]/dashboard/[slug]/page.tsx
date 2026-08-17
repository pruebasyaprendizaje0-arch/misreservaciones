import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { getLocale, getTranslations } from 'next-intl/server';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import Link from 'next/link';
import { ReservationCalendar } from '@/components/dashboard/ReservationCalendar';

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
  const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.ownerId !== userId) notFound();

  const db = getTenantClient(tenant.dbUrl);
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const startRange = addDays(todayStart, -30);
  const endRange = addDays(todayStart, 90);

  const [today, calendarReservations, servicesCount, customersCount] = await Promise.all([
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{tenant.name}</h1>
          <p className="text-sm text-slate-500 mt-1">Panel de administración de tu negocio</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/${locale}`}
            className="btn-secondary text-xs sm:text-sm inline-flex items-center gap-1.5"
          >
            🏠 App principal
          </a>
          <a
            href={`/${locale}/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs sm:text-sm inline-flex items-center gap-1.5"
          >
            🔗 Ver página pública
          </a>
        </div>
      </div>

      {/* ── Quick Nav ──────────────────────────────────────── */}
      <nav className="mt-6 flex flex-wrap gap-2">
        {[
          { href: `/${locale}/dashboard/${slug}?view=calendar`, label: tenant.industry === 'MEDICO' ? '📅 Consultas' : tenant.industry === 'HOSTAL' ? '📅 Estancias' : '📅 Reservas' },
          { href: `/${locale}/dashboard/${slug}/servicios`, label: tenant.industry === 'MEDICO' ? '🩺 Consultas y Tratamientos' : tenant.industry === 'HOSTAL' ? '🛌 Habitaciones y Tarifas' : tenant.industry === 'MASAJE' ? '💆 Servicios y Masajes' : '💈 Servicios y Cortes' },
          { href: `/${locale}/dashboard/${slug}/personal`, label: tenant.industry === 'MEDICO' ? '👥 Médicos' : tenant.industry === 'HOSTAL' ? '👥 Empleados' : tenant.industry === 'MASAJE' ? '👥 Terapeutas' : '👥 Estilistas' },
          { href: `/${locale}/dashboard/${slug}/recursos`, label: tenant.industry === 'MEDICO' ? '🏥 Consultorios' : tenant.industry === 'HOSTAL' ? '🔑 Habitaciones' : tenant.industry === 'MASAJE' ? '🏠 Cabinas / Camillas' : '🪑 Sillas / Tocadores' },
          { href: `/${locale}/dashboard/${slug}/clientes`, label: tenant.industry === 'MEDICO' ? '👤 Pacientes' : tenant.industry === 'HOSTAL' ? '👤 Huéspedes' : '👤 Clientes' },
          { href: `/${locale}/dashboard/${slug}/estadisticas`, label: '📊 Estadísticas' },
          { href: `/${locale}/dashboard/${slug}/perfil`, label: '⚙️ Perfil' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* ── View switcher for reservations ────────────────── */}
      <div className="mt-6 flex items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
          <Link
            href={`/${locale}/dashboard/${slug}?view=calendar`}
            className={`px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition ${
              view === 'calendar'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Calendario
          </Link>
          <Link
            href={`/${locale}/dashboard/${slug}?view=list`}
            className={`px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition ${
              view === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
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
              <h2 className="text-xl font-bold text-slate-900 mb-4">{t('calendar')}</h2>
              <ReservationCalendar initialEvents={events} locale={locale} />
            </div>
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-bold text-slate-900">{t('todayReservations')}</h2>
                {today.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500 italic">No hay reservas programadas para hoy.</p>
                ) : (
                  <ReservationsTable rows={today} locale={locale} />
                )}
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900">Próximas Reservas</h2>
                {calendarReservations.filter(r => r.startsAt > todayEnd).length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500 italic">No hay reservas programadas próximas.</p>
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
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              {tenant.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl">
                  🏪
                </div>
              )}
              <div>
                <h3 className="font-bold text-slate-900 leading-tight">{tenant.name}</h3>
                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium capitalize">
                  {tenant.industry.toLowerCase()}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase block">Plan y Estado</span>
                <div className="flex gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    tenant.plan === 'BUSINESS'
                      ? 'bg-purple-100 text-purple-700'
                      : tenant.plan === 'PRO'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {tenant.plan}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    tenant.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {tenant.status}
                  </span>
                </div>
              </div>

              {tenant.phone && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase block">Contacto</span>
                  <a href={`tel:${tenant.phone}`} className="text-slate-700 hover:text-indigo-600 transition-colors font-medium">
                    📞 {tenant.phone}
                  </a>
                </div>
              )}

              {(tenant.provincia || tenant.canton || tenant.parroquia || tenant.address) && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase block">Ubicación</span>
                  <p className="text-slate-600 text-xs mt-0.5">
                    {[tenant.parroquia, tenant.canton, tenant.provincia].filter(Boolean).join(', ')}
                  </p>
                  {tenant.address && (
                    <p className="text-slate-700 font-medium mt-1">📍 {tenant.address}</p>
                  )}
                  {tenant.lat && tenant.lng && (
                    <a
                      href={`https://www.google.com/maps?q=${tenant.lat},${tenant.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline mt-1 inline-block"
                    >
                      🗺 Ver en Google Maps
                    </a>
                  )}
                </div>
              )}

              {tenant.description && (
                <div className="pt-2 border-t border-slate-50">
                  <span className="text-xs font-semibold text-slate-400 uppercase block">Descripción</span>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed italic">
                    "{tenant.description}"
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <Link
                href={`/${locale}/dashboard/${slug}/perfil`}
                className="w-full text-center block text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/85 py-2 rounded-lg transition-colors"
              >
                ⚙️ Editar Información
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-slate-950">{value}</div>
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
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3">Fecha y Hora</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Servicio</th>
            <th className="px-4 py-3">Recurso</th>
            <th className="px-4 py-3">Personal</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-4 py-3.5 font-medium text-slate-900">
                {r.startsAt.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}
              </td>
              <td className="px-4 py-3.5 text-slate-700">{r.customer.name}</td>
              <td className="px-4 py-3.5 text-slate-700 font-medium">{r.service.name}</td>
              <td className="px-4 py-3.5 text-slate-500">{r.resource?.name ?? '—'}</td>
              <td className="px-4 py-3.5 text-slate-500">{r.staff?.name ?? '—'}</td>
              <td className="px-4 py-3.5">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    r.status === 'CONFIRMED'
                      ? 'bg-blue-50 text-blue-700'
                      : r.status === 'PENDING'
                      ? 'bg-amber-50 text-amber-700'
                      : r.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
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
