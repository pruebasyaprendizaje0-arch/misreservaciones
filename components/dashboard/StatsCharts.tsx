'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type DailyCount = { date: string; reservas: number };
type StatusBreakdown = { status: string; count: number };
type TopService = { name: string; count: number };

type Props = {
  dailyCounts: DailyCount[];
  statusBreakdown: StatusBreakdown[];
  topServices: TopService[];
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#3b82f6',
  PENDING: '#f59e0b',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
  NO_SHOW: '#94a3b8',
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmada',
  PENDING: 'Pendiente',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-2.5 text-sm">
        <p className="font-semibold text-slate-700">{label}</p>
        <p className="text-indigo-600 font-bold mt-0.5">
          {payload[0].value} reservas
        </p>
      </div>
    );
  }
  return null;
};

export function StatsCharts({ dailyCounts, statusBreakdown, topServices }: Props) {
  return (
    <div className="mt-6 space-y-6">
      {/* Area chart - daily trend */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">Reservas por Día</h3>
        <p className="text-xs text-slate-400 mb-5">Últimos 30 días</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dailyCounts} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradReservas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              interval={Math.floor(dailyCounts.length / 6)}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="reservas"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#gradReservas)"
              dot={false}
              activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie chart - status breakdown */}
        {statusBreakdown.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1">Estado de Reservas</h3>
            <p className="text-xs text-slate-400 mb-4">Distribución por estado</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="count"
                  paddingAngle={3}
                >
                  {statusBreakdown.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] ?? '#cbd5e1'}
                    />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => STATUS_LABELS[value] ?? value}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Tooltip
                  formatter={(value, name) => [value, STATUS_LABELS[name as string] ?? name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bar chart - top services */}
        {topServices.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1">Servicios Más Reservados</h3>
            <p className="text-xs text-slate-400 mb-4">Top {topServices.length} servicios</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={topServices}
                layout="vertical"
                margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
                  {topServices.map((_, index) => (
                    <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
