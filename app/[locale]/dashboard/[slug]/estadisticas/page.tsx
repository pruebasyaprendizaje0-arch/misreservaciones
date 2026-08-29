import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getTenantContext } from '@/lib/tenant-context';
import { isCentralApiEnabled } from '@/lib/central-api';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { startOfDay, subDays, format, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { StatsCharts } from '@/components/dashboard/StatsCharts';
import { SuperadminBanner } from '@/components/dashboard/SuperadminBanner';

export default async function StatsPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const userId = (session.user as { id: string }).id;
  const isSuperAdmin = (session.user as { role?: string }).role === 'PLATFORM_ADMIN';

  const ctx = await getTenantContext(slug);
  let tenant = ctx.tenant;

  if (!tenant && !isCentralApiEnabled()) {
    try {
      tenant = (await prismaControl.tenant.findUnique({
        where: { slug },
        include: { owner: { select: { email: true, name: true } } },
      })) as any;
    } catch {
      tenant = null;
    }
  }

  if (!tenant) notFound();

  const now = new Date();
  const todayStart = startOfDay(now);
  const thirtyDaysAgo = subDays(todayStart, 29);

  let reservations: any[] = [];
  let customersCount = 0;

  if (ctx.dbUrl) {
    try {
      const db = getTenantClient(ctx.dbUrl);
      [reservations, customersCount] = await Promise.all([
        db.reservation.findMany({
          where: { startsAt: { gte: thirtyDaysAgo, lte: now } },
          include: { service: { select: { name: true } } },
          orderBy: { startsAt: 'asc' },
        }),
        db.customer.count(),
      ]);
    } catch {}
  }

  const days = eachDayOfInterval({ start: thirtyDaysAgo, end: todayStart });
  const dailyCounts = days.map((day) => {
    const dayStr = format(day, 'dd MMM', { locale: es });
    const count = reservations.filter((r: any) => {
      const rDay = startOfDay(r.startsAt);
      return rDay.getTime() === day.getTime();
    }).length;
    return { date: dayStr, reservas: count };
  });

  const statusBreakdown = ['CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((status) => ({
    status,
    count: reservations.filter((r: any) => r.status === status).length,
  })).filter((s) => s.count > 0);

  const serviceMap = new Map<string, number>();
  for (const r of reservations) {
    const key = r.service?.name || 'Servicio';
    serviceMap.set(key, (serviceMap.get(key) ?? 0) + 1);
  }
  const topServices = Array.from(serviceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  const totalReservations = reservations.length;
  const completedCount = reservations.filter((r: any) => r.status === 'COMPLETED').length;
  const cancelledCount = reservations.filter((r: any) => r.status === 'CANCELLED' || r.status === 'NO_SHOW').length;
  const conversionRate = totalReservations > 0
    ? Math.round((completedCount / totalReservations) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {isSuperAdmin && (
          <SuperadminBanner
            tenantName={tenant.name}
            tenantSlug={slug}
            ownerEmail={(tenant as any).owner?.email || session.user?.email}
            locale={locale}
          />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">📊 Estadísticas</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tenant.name} · Últimos 30 días</p>
          </div>
          <Link
            href={`/${locale}/dashboard/${slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
          >
            ← Volver al Panel
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Reservas', value: totalReservations, icon: '📅', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/60' },
            { label: 'Completadas', value: completedCount, icon: '✅', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/60' },
            { label: 'Canceladas', value: cancelledCount, icon: '❌', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/60' },
            { label: 'Clientes', value: customersCount, icon: '👤', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/60' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${kpi.bg}`}>
                {kpi.icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{kpi.label}</p>
                <p className={`text-3xl font-extrabold ${kpi.color}`}>{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tasa de Completación</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{conversionRate}%</p>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
              style={{ width: `${conversionRate}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            {completedCount} completadas de {totalReservations} reservas totales
          </p>
        </div>

        <StatsCharts
          dailyCounts={dailyCounts}
          statusBreakdown={statusBreakdown}
          topServices={topServices}
        />
      </div>
    </div>
  );
}
