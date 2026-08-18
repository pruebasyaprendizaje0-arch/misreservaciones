import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await getLocale();
  const session = await auth();

  // If not authenticated, redirect to sign-in
  if (!session?.user) {
    redirect(`/${locale}/sign-in`);
  }

  // Double-check the role is PLATFORM_ADMIN
  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'PLATFORM_ADMIN') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-xl">
          <span className="text-4xl">🚫</span>
          <h1 className="text-xl font-bold text-white mt-4">Acceso Denegado</h1>
          <p className="text-sm text-slate-400 mt-2">
            No tienes los permisos requeridos para acceder a esta sección. Solo administradores de la plataforma.
          </p>
          <div className="mt-6">
            <Link
              href={`/${locale}`}
              className="inline-block rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 text-sm transition-all"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch tenants, users, and audit logs
  const [tenants, users, logs] = await Promise.all([
    prismaControl.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { name: true, email: true },
        },
      },
    }),
    prismaControl.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { ownedTenants: true },
        },
      },
    }),
    prismaControl.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { email: true },
        },
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl bg-slate-900 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>🛡️</span> Panel de Superusuario
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Administración global del control plane de la plataforma y de sus inquilinos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}`}
              className="rounded-lg bg-slate-800 border border-slate-700/80 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all shadow-sm"
            >
              🏠 App principal
            </Link>
          </div>
        </div>

        {/* Dashboard contents */}
        <AdminDashboard
          locale={locale}
          initialTenants={tenants.map((t) => ({
            id: t.id,
            slug: t.slug,
            name: t.name,
            industry: t.industry,
            status: t.status,
            plan: t.plan,
            owner: t.owner,
            provincia: t.provincia,
            createdAt: t.createdAt.toISOString(),
            logoUrl: t.logoUrl,
          }))}
          initialUsers={users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt.toISOString(),
            _count: u._count,
          }))}
          initialLogs={logs.map((l) => ({
            id: l.id,
            actor: l.actor,
            action: l.action,
            target: l.target,
            metadata: l.metadata,
            createdAt: l.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
