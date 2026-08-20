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
  isTrial: boolean;
  trialEndsAt: string | null;
  owner: { name: string | null; email: string };
  provincia: string | null;
  canton: string | null;
  parroquia: string | null;
  comuna: string | null;
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
  const [industryFilter, setIndustryFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Loading/saving state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Filtered lists
  const filteredTenants = tenants.filter((t) => {
    const q = tenantSearch.toLowerCase();
    const matchesSearch =
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      t.owner.email.toLowerCase().includes(q) ||
      (t.provincia && t.provincia.toLowerCase().includes(q)) ||
      (t.canton && t.canton.toLowerCase().includes(q));

    const matchesIndustry = !industryFilter || t.industry === industryFilter;
    const matchesPlan = !planFilter || t.plan === planFilter;
    const matchesStatus = !statusFilter || t.status === statusFilter;

    return matchesSearch && matchesIndustry && matchesPlan && matchesStatus;
  });

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q))
    );
  });

  // Update tenant plan, status, or trial
  async function handleUpdateTenant(slug: string, fields: Partial<Tenant>) {
    setActionLoading(`${slug}-update`);
    try {
      const res = await fetch(`/api/tenants/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });

      if (!res.ok) throw new Error('Error al actualizar el negocio');

      const data = await res.json();
      setTenants((prev) =>
        prev.map((t) =>
          t.slug === slug
            ? {
                ...t,
                ...data.tenant,
                trialEndsAt: data.tenant.trialEndsAt
                  ? new Date(data.tenant.trialEndsAt).toISOString()
                  : null,
              }
            : t
        )
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
    if (
      !confirm(
        `¿Estás seguro de eliminar el negocio "${slug}" de forma permanente?\n\nEsta acción destruirá su base de datos y no se puede deshacer.`
      )
    ) {
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
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === 'ACTIVE').length;
  const suspendedTenants = tenants.filter((t) => t.status === 'SUSPENDED').length;
  const trialTenants = tenants.filter((t) => t.isTrial).length;

  const proCount = tenants.filter((t) => t.plan === 'PRO').length;
  const businessCount = tenants.filter((t) => t.plan === 'BUSINESS').length;
  const estimatedMRR = proCount * 29 + businessCount * 79;

  const byProvince = tenants.reduce((acc, t) => {
    const prov = t.provincia || 'Sin Especificar';
    acc[prov] = (acc[prov] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byIndustry = tenants.reduce((acc, t) => {
    acc[t.industry] = (acc[t.industry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      {/* ───── TOP PLATFORM KPI SCORECARDS ───────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Negocios
            </span>
            <span className="text-xl">🏢</span>
          </div>
          <p className="mt-2 text-3xl font-black text-white">{totalTenants}</p>
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="text-emerald-400">🟢 {activeTenants} activos</span>
            <span>·</span>
            <span className="text-amber-400">🟡 {suspendedTenants} susp.</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pruebas Gratis (Demos)
            </span>
            <span className="text-xl">🎁</span>
          </div>
          <p className="mt-2 text-3xl font-black text-indigo-400">{trialTenants}</p>
          <p className="mt-2 text-xs text-slate-400 font-medium">
            30 días de acceso completo activo
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              MRR Estimado
            </span>
            <span className="text-xl">💵</span>
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-400">${estimatedMRR} / mes</p>
          <div className="mt-2 text-xs text-slate-400 font-medium flex items-center gap-2">
            <span>{proCount} PRO ($29)</span>
            <span>·</span>
            <span>{businessCount} BUSINESS ($79)</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Usuarios Registrados
            </span>
            <span className="text-xl">👥</span>
          </div>
          <p className="mt-2 text-3xl font-black text-white">{users.length}</p>
          <p className="mt-2 text-xs text-slate-400 font-medium">
            Owners, Staff y Clientes globales
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-sm font-bold border shadow-md ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 pb-px gap-2 overflow-x-auto">
        {[
          { id: 'tenants', label: '🏢 Negocios & Tenants' },
          { id: 'users', label: '👥 Usuarios del Sistema' },
          { id: 'logs', label: '📜 Stream de Auditoría' },
          { id: 'stats', label: '📊 Estadísticas GEO & Rubros' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-500 text-white bg-slate-800/40 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ───── TAB 1: TENANTS ──────────────────────────────────── */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="search"
              placeholder="Buscar por nombre, slug, email, ciudad..."
              className="rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
            />

            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas las Industrias</option>
              <option value="HOSTAL">🏨 Hostales / Alojamientos</option>
              <option value="MASAJE">💆 Spa / Masajes</option>
              <option value="PELUQUERIA">💈 Peluquería / Barbería</option>
              <option value="MEDICO">🩺 Consultorios Médicos</option>
            </select>

            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos los Planes</option>
              <option value="FREE">Plan FREE</option>
              <option value="PRO">Plan PRO</option>
              <option value="BUSINESS">Plan BUSINESS</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos los Estados</option>
              <option value="ACTIVE">🟢 ACTIVE (Activos)</option>
              <option value="SUSPENDED">🟡 SUSPENDED (Suspendidos)</option>
              <option value="ARCHIVED">🔴 ARCHIVED (Archivados)</option>
            </select>
          </div>

          {/* Tenants Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-extrabold text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Negocio</th>
                  <th className="px-5 py-4">Ubicación / GEO</th>
                  <th className="px-5 py-4">Propietario</th>
                  <th className="px-5 py-4">Demo / Trial</th>
                  <th className="px-5 py-4">Plan</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500 italic">
                      No se encontraron negocios registrados.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => {
                    const daysLeft = t.trialEndsAt
                      ? Math.max(
                          0,
                          Math.ceil(
                            (new Date(t.trialEndsAt).getTime() - new Date().getTime()) /
                              (1000 * 60 * 60 * 24)
                          )
                        )
                      : 0;

                    return (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {t.logoUrl ? (
                              <img
                                src={t.logoUrl}
                                alt={t.name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-700"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-base">
                                🏢
                              </div>
                            )}
                            <div>
                              <h4 className="font-extrabold text-white leading-tight text-sm">
                                {t.name}
                              </h4>
                              <p className="text-slate-400 text-[11px] font-mono mt-0.5">
                                {t.slug}.misreservaciones.com
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {t.provincia ? (
                            <div>
                              <span className="font-bold text-slate-200 block text-xs">
                                📍 {t.canton || t.provincia}
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                {[t.comuna, t.parroquia, t.provincia].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Sin ubicación</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-slate-200 font-bold">{t.owner.name || '—'}</div>
                          <div className="text-slate-400 text-[11px] font-mono">{t.owner.email}</div>
                        </td>

                        <td className="px-5 py-4">
                          {t.isTrial ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-950 border border-emerald-800 text-emerald-300 font-extrabold px-2.5 py-1 rounded-full text-[10px]">
                              🎁 {daysLeft} días demo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-400 font-bold px-2 py-0.5 rounded text-[10px]">
                              Suscrito
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <select
                            className="bg-slate-800 border border-slate-700 rounded-lg text-xs px-2.5 py-1 font-extrabold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={t.plan}
                            disabled={actionLoading === `${t.slug}-update`}
                            onChange={(e) =>
                              handleUpdateTenant(t.slug, { plan: e.target.value as any })
                            }
                          >
                            <option value="FREE">FREE</option>
                            <option value="PRO">PRO ($29/m)</option>
                            <option value="BUSINESS">BUSINESS ($79/m)</option>
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <select
                            className={`border rounded-lg text-xs px-2.5 py-1 font-extrabold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              t.status === 'ACTIVE'
                                ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                                : 'bg-amber-950 border-amber-800 text-amber-300'
                            }`}
                            value={t.status}
                            disabled={actionLoading === `${t.slug}-update`}
                            onChange={(e) =>
                              handleUpdateTenant(t.slug, { status: e.target.value as any })
                            }
                          >
                            <option value="ACTIVE" className="bg-slate-900 text-emerald-300">
                              🟢 ACTIVE
                            </option>
                            <option value="SUSPENDED" className="bg-slate-900 text-amber-300">
                              🟡 SUSPENDED
                            </option>
                            <option value="ARCHIVED" className="bg-slate-900 text-slate-400">
                              🔴 ARCHIVED
                            </option>
                          </select>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Link
                              href={`/${locale}/dashboard/${t.slug}`}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-[11px] transition shadow-sm"
                            >
                              ⚙️ Panel
                            </Link>
                            <Link
                              href={`/${locale}/${t.slug}`}
                              target="_blank"
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition"
                            >
                              🔗 Ver
                            </Link>
                            <button
                              onClick={() => handleDeleteTenant(t.slug)}
                              disabled={actionLoading === `${t.slug}-delete`}
                              className="bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───── TAB 2: USERS ────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <input
            type="search"
            placeholder="Buscar usuario por correo o nombre..."
            className="block w-full max-w-md rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-extrabold text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Usuario</th>
                  <th className="px-5 py-4">Correo Electrónico</th>
                  <th className="px-5 py-4">Rol del Sistema</th>
                  <th className="px-5 py-4">Negocios Propios</th>
                  <th className="px-5 py-4">Fecha Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-500 italic">
                      No se encontraron usuarios.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-bold text-white text-sm">{u.name || '—'}</td>
                      <td className="px-5 py-4 text-slate-300 font-mono text-xs">{u.email}</td>
                      <td className="px-5 py-4">
                        <select
                          className="bg-slate-800 border border-slate-700 rounded-lg text-xs px-2.5 py-1 font-extrabold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={u.role}
                          disabled={actionLoading === `${u.id}-role`}
                          onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                        >
                          <option value="PLATFORM_ADMIN">👑 PLATFORM_ADMIN</option>
                          <option value="OWNER">🏢 OWNER</option>
                          <option value="STAFF">👥 STAFF</option>
                          <option value="CUSTOMER">👤 CUSTOMER</option>
                        </select>
                      </td>
                      <td className="px-5 py-4 text-center font-extrabold text-indigo-400">
                        {u._count.ownedTenants}
                      </td>
                      <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
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

      {/* ───── TAB 3: LOGS STREAM ──────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <span>📜</span> Stream de Registros de Auditoría Global
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-extrabold text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Fecha y Hora</th>
                  <th className="px-5 py-3.5">Actor</th>
                  <th className="px-5 py-3.5">Acción Ejecutada</th>
                  <th className="px-5 py-3.5">Destino</th>
                  <th className="px-5 py-3.5">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500 italic">
                      No se han registrado eventos de auditoría.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-slate-200 font-bold">
                        {log.actor?.email ?? 'Sistema'}
                      </td>
                      <td className="px-5 py-3 text-indigo-400 font-bold">{log.action}</td>
                      <td className="px-5 py-3 text-slate-300">{log.target || '—'}</td>
                      <td
                        className="px-5 py-3 text-slate-500 max-w-xs truncate"
                        title={JSON.stringify(log.metadata)}
                      >
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

      {/* ───── TAB 4: STATS & ANALYTICS ────────────────────────── */}
      {activeTab === 'stats' && (
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Province Breakdown */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>📍</span> Negocios por Provincia en Ecuador
            </h3>
            <div className="space-y-2">
              {Object.entries(byProvince).map(([prov, count]) => {
                const percentage = Math.round((count / totalTenants) * 100) || 0;
                return (
                  <div key={prov} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-300">
                      <span>{prov}</span>
                      <span>
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Industry Breakdown */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>📊</span> Negocios por Industria
            </h3>
            <div className="space-y-3">
              {Object.entries(byIndustry).map(([ind, count]) => {
                const labels: Record<string, string> = {
                  HOSTAL: '🏨 Hostales & Alojamientos',
                  MASAJE: '💆 Spa & Masajes',
                  PELUQUERIA: '💈 Peluquerías & Barberías',
                  MEDICO: '🩺 Consultorios Médicos',
                };
                const percentage = Math.round((count / totalTenants) * 100) || 0;
                return (
                  <div
                    key={ind}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between"
                  >
                    <span className="text-xs font-extrabold text-slate-200">
                      {labels[ind] || ind}
                    </span>
                    <span className="text-sm font-black text-indigo-400">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
