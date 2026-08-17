import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { startOfDay, subDays, format, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { StatsCharts } from '@/components/dashboard/StatsCharts';

export default async function StatsPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const userId = (session.user as { id: string }).id;
  const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.ownerId !== userId) notFound();

  const db = getTenantClient(tenant.dbUrl);
  const now = new Date();
  const todayStart = startOfDay(now);
  const thirtyDaysAgo = subDays(todayStart, 29);

  // Load all reservations in the last 30 days
  const reservations = await db.reservation.findMany({
    where: { startsAt: { gte: thirtyDaysAgo, lte: now } },
    include: { service: { select: { name: true } } },
    orderBy: { startsAt: 'asc' },
  });

  // Build per-day counts for the last 30 days
  const days = eachDayOfInterval({ start: thirtyDaysAgo, end: todayStart });
  const dailyCounts = days.map((day) => {
    const dayStr = format(day, 'dd MMM', { locale: es });
    const count = reservations.filter((r) => {
      const rDay = startOfDay(r.startsAt);
      return rDay.getTime() === day.getTime();
    }).length;
    return { date: dayStr, reservas: count };
  });

  // Status breakdown
  const statusBreakdown = ['CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((status) => ({
    status,
    count: reservations.filter((r) => r.status === status).length,
  })).filter((s) => s.count > 0);

  // Top services
  const serviceMap = new Map<string, number>();
  for (const r of reservations) {
    const key = r.service.name;
    serviceMap.set(key, (serviceMap.get(key) ?? 0) + 1);
  }
  const topServices = Array.from(serviceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  // Summary stats
  const totalReservations = reservations.length;
  const completedCount = reservations.filter((r) => r.status === 'COMPLETED').length;
  const cancelledCount = reservations.filter((r) => r.status === 'CANCELLED' || r.status === 'NO_SHOW').length;
  const conversionRate = totalReservations > 0
    ? Math.round((completedCount / totalReservations) * 100)
    : 0;

  const [customersCount] = await Promise.all([db.customer.count()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Estadísticas</h1>
          <p className="text-sm text-slate-500 mt-1">{tenant.name} · Últimos 30 días</p>
        </div>
        <Link href={`/${locale}/dashboard/${slug}`} className="btn-secondary text-sm">
          ← Volver al Panel
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Reservas', value: totalReservations, icon: '📅', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completadas', value: completedCount, icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Canceladas', value: cancelledCount, icon: '❌', color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Clientes', value: customersCount, icon: '👤', color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${kpi.bg}`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{kpi.label}</p>
              <p className={`text-3xl font-extrabold ${kpi.color}`}>{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tasa de completación */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-700">Tasa de Completación</p>
          <p className="text-lg font-extrabold text-slate-900">{conversionRate}%</p>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
            style={{ width: `${conversionRate}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {completedCount} completadas de {totalReservations} reservas totales
        </p>
      </div>

      {/* Charts (client component) */}
      <StatsCharts
        dailyCounts={dailyCounts}
        statusBreakdown={statusBreakdown}
        topServices={topServices}
      />
    </div>
  );
}
