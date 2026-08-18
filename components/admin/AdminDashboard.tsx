'use client';

import { useState } from 'react';
import Link from 'next/link';

type Tenant = {
  id: string;
  slug: string;
  name: string;
  industry: string;
  status: string;
  plan: string;
  owner: { name: string | null; email: string };
  provincia: string | null;
  createdAt: string;
  logoUrl: string | null;
};

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  _count: { ownedTenants: number };
};

type AuditLog = {
  id: string;
  actor: { email: string } | null;
  action: string;
  target: string | null;
  metadata: any;
  createdAt: string;
};

type Props = {
  initialTenants: Tenant[];
  initialUsers: User[];
  initialLogs: AuditLog[];
  locale: string;
};

export function AdminDashboard({ initialTenants, initialUsers, initialLogs, locale }: Props) {
  const [activeTab, setActiveTab] = useState<'tenants' | 'users' | 'logs' | 'stats'>('tenants');
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [logs] = useState<AuditLog[]>(initialLogs);

  // Search/Filter state
  const [tenantSearch, setTenantSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Loading/saving state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtered lists
  const filteredTenants = tenants.filter((t) => {
    const q = tenantSearch.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      t.owner.email.toLowerCase().includes(q)
    );
  });

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q))
    );
  });

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Change tenant plan or status
  async function handleUpdateTenant(slug: string, field: 'plan' | 'status', value: string) {
    setActionLoading(`${slug}-${field}`);
    try {
      const res = await fetch(`/api/tenants/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) throw new Error('Error al actualizar el negocio');
      
      const data = await res.json();
      setTenants((prev) =>
        prev.map((t) => (t.slug === slug ? { ...t, ...data.tenant } : t))
      );
      showMsg(`Negocio ${slug} actualizado correctamente.`);
    } catch (err: any) {
      showMsg(err.message || 'Error al actualizar', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  // Delete tenant
  async function handleDeleteTenant(slug: string) {
    if (!confirm(`¿Estás seguro de eliminar el negocio "${slug}" de forma permanente?\n\nEsta acción destruirá su base de datos y no se puede deshacer.`)) {
      return;
    }

    setActionLoading(`${slug}-delete`);
    try {
      const res = await fetch(`/api/tenants/${slug}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Error al eliminar el negocio');

      setTenants((prev) => prev.filter((t) => t.slug !== slug));
      showMsg(`El negocio "${slug}" y su base de datos fueron eliminados permanentemente.`);
    } catch (err: any) {
      showMsg(err.message || 'Error al eliminar', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  // Change user role
  async function handleUpdateUserRole(userId: string, role: string) {
    setActionLoading(`${userId}-role`);
    try {
      const res = await fetch(`/api/admin/users`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });

      if (!res.ok) throw new Error('Error al actualizar el rol');

      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: data.user.role } : u))
      );
      showMsg(`Rol del usuario actualizado a ${role}.`);
    } catch (err: any) {
      showMsg(err.message || 'Error al actualizar rol', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  // Stats calculation
  const stats = {
    totalTenants: tenants.length,
    totalUsers: users.length,
    activeTenants: tenants.filter((t) => t.status === 'ACTIVE').length,
    suspendedTenants: tenants.filter((t) => t.status === 'SUSPENDED').length,
    freePlan: tenants.filter((t) => t.plan === 'FREE').length,
    proPlan: tenants.filter((t) => t.plan === 'PRO').length,
    businessPlan: tenants.filter((t) => t.plan === 'BUSINESS').length,
    byIndustry: tenants.reduce((acc, curr) => {
      acc[curr.industry] = (acc[curr.industry] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          } animate-fade-in`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs Nav */}
      <div className="flex border-b border-slate-800 pb-px gap-2">
        {[
          { id: 'tenants', label: '🏢 Negocios / Tenants' },
          { id: 'users', label: '👥 Usuarios' },
          { id: 'logs', label: '📜 Auditoría' },
          { id: 'stats', label: '📊 Estadísticas' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-indigo-500 text-white bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ───── TAB: TENANTS ───────────────────────────────────── */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <input
              type="search"
              placeholder="Buscar negocio por nombre, slug o dueño..."
              className="block w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Negocio</th>
                  <th className="px-5 py-3.5">Contacto / Dueño</th>
                  <th className="px-5 py-3.5">Rubro</th>
                  <th className="px-5 py-3.5">Plan</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Fecha</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-500 italic">
                      No se encontraron negocios.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {t.logoUrl ? (
                            <img src={t.logoUrl} alt={t.name} className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-900 flex items-center justify-center text-sm">
                              🏢
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-white leading-tight">{t.name}</h4>
                            <p className="text-slate-500 text-[10px] mt-0.5">{t.slug}.{process.env.ROOT_DOMAIN || 'localhost'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-slate-300 font-medium">{t.owner.name || 'Sin nombre'}</div>
                        <div className="text-slate-500 text-[10px] mt-0.5">{t.owner.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="bg-slate-800 px-2 py-0.5 rounded font-semibold text-slate-400 capitalize">
                          {t.industry.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          className="bg-slate-800 border border-slate-700 rounded text-xs px-2 py-1 font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={t.plan}
                          disabled={actionLoading === `${t.slug}-plan`}
                          onChange={(e) => handleUpdateTenant(t.slug, 'plan', e.target.value)}
                        >
                          <option value="FREE">FREE</option>
                          <option value="PRO">PRO</option>
                          <option value="BUSINESS">BUSINESS</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          className={`border rounded text-xs px-2 py-1 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                            t.status === 'ACTIVE'
                              ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
                              : 'bg-amber-950 border-amber-800 text-amber-400'
                          }`}
                          value={t.status}
                          disabled={actionLoading === `${t.slug}-status`}
                          onChange={(e) => handleUpdateTenant(t.slug, 'status', e.target.value)}
                        >
                          <option value="ACTIVE" className="bg-slate-900 text-emerald-400">ACTIVE</option>
                          <option value="SUSPENDED" className="bg-slate-900 text-amber-400">SUSPENDED</option>
                          <option value="ARCHIVED" className="bg-slate-900 text-slate-400">ARCHIVED</option>
                        </select>
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-mono text-[10px]">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/${locale}/dashboard/${t.slug}`}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-[11px] font-bold transition"
                          >
                            Ver Panel
                          </Link>
                          <button
                            onClick={() => handleDeleteTenant(t.slug)}
                            disabled={actionLoading === `${t.slug}-delete`}
                            className="bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 px-2.5 py-1 rounded text-[11px] font-bold transition"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── TAB: USERS ────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <input
            type="search"
            placeholder="Buscar usuario por correo o nombre..."
            className="block w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Usuario</th>
                  <th className="px-5 py-3.5">Correo</th>
                  <th className="px-5 py-3.5">Rol</th>
                  <th className="px-5 py-3.5">Negocios Propios</th>
                  <th className="px-5 py-3.5">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500 italic">
                      No se encontraron usuarios.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-white">
                        {u.name || '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {u.email}
                      </td>
                      <td className="px-5 py-4">
                        <select
                          className={`bg-slate-800 border border-slate-700 rounded text-xs px-2 py-1 font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                          value={u.role}
                          disabled={actionLoading === `${u.id}-role`}
                          onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                        >
                          <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
                          <option value="OWNER">OWNER</option>
                          <option value="STAFF">STAFF</option>
                          <option value="CUSTOMER">CUSTOMER</option>
                        </select>
                      </td>
                      <td className="px-5 py-4 text-center font-bold text-indigo-400">
                        {u._count.ownedTenants}
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-mono text-[10px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── TAB: LOGS ─────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">📜 Registros de Auditoría del Sistema</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-[11px] text-slate-300">
              <thead className="bg-slate-800 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Fecha y Hora</th>
                  <th className="px-5 py-3">Actor (Email)</th>
                  <th className="px-5 py-3">Acción</th>
                  <th className="px-5 py-3">Destino</th>
                  <th className="px-5 py-3">Detalle (Metadatos)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-slate-500 italic">
                      No hay registros de auditoría.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/35 transition-colors">
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-slate-300">
                        {log.actor?.email ?? 'Sistema / Externo'}
                      </td>
                      <td className="px-5 py-3 text-indigo-400 font-bold">
                        {log.action}
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {log.target || '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-500 max-w-xs truncate" title={JSON.stringify(log.metadata)}>
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── TAB: STATS ────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">
            <span className="text-xs text-slate-500 font-semibold block uppercase">Total Negocios</span>
            <span className="text-3xl font-extrabold text-white block mt-1">{stats.totalTenants}</span>
            <span className="text-[10px] text-slate-400 block mt-2">
              🟢 {stats.activeTenants} Activos · 🟡 {stats.suspendedTenants} Suspendidos
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">
            <span className="text-xs text-slate-500 font-semibold block uppercase">Usuarios Totales</span>
            <span className="text-3xl font-extrabold text-white block mt-1">{stats.totalUsers}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">
            <span className="text-xs text-slate-500 font-semibold block uppercase">Planes Activos</span>
            <div className="mt-2 space-y-1 text-xs text-slate-300">
              <div className="flex justify-between"><span>Free:</span> <span className="font-bold">{stats.freePlan}</span></div>
              <div className="flex justify-between"><span>Pro:</span> <span className="font-bold">{stats.proPlan}</span></div>
              <div className="flex justify-between"><span>Business:</span> <span className="font-bold">{stats.businessPlan}</span></div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">
            <span className="text-xs text-slate-500 font-semibold block uppercase">Por Rubro / Industria</span>
            <div className="mt-2 space-y-1 text-xs text-slate-300">
              {Object.entries(stats.byIndustry).map(([ind, count]) => (
                <div key={ind} className="flex justify-between">
                  <span className="capitalize">{ind.toLowerCase()}:</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
