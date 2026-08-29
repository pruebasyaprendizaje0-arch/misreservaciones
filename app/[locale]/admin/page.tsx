import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { isCentralApiEnabled, getCentralBusinesses } from '@/lib/central-api';

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
  let tenants: any[] = [];
  let users: any[] = [];
  let logs: any[] = [];

  const accessToken = (session as any)?.accessToken;
  if (isCentralApiEnabled()) {
    try {
      const centralBusinesses = await getCentralBusinesses(accessToken);
      tenants = centralBusinesses.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        industry: b.industry,
        status: 'ACTIVE',
        plan: b.plan || 'FREE',
        isTrial: false,
        trialEndsAt: null,
        owner: { name: session.user?.name || 'Propietario Central', email: session.user?.email || '' },
        provincia: null,
        canton: null,
        parroquia: null,
        comuna: null,
        createdAt: new Date(b.createdAt),
        logoUrl: b.logoUrl,
      }));
    } catch (e) {
      console.warn('[AdminPage] Advertencia al obtener negocios de API Central:', e);
    }
  } else {
    try {
      [tenants, users, logs] = await Promise.all([
        prismaControl.tenant.findMany({
          orderBy: { createdAt: 'desc' },
          include: { owner: { select: { name: true, email: true } } },
        }),
        prismaControl.user.findMany({
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { ownedTenants: true } } },
        }),
        prismaControl.auditLog.findMany({
          take: 60,
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { email: true } } },
        }),
      ]);
    } catch (e) {
      console.warn('[AdminPage] Advertencia al consultar base de control local:', e);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl bg-slate-900 border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-indigo-950/30 space-y-8">
        {/* Header Superadmin */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
              👑 Control Plane · Superadministrador
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>🛡️</span> Dashboard General de la Plataforma
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Monitoreo en tiempo real de todos los negocios, usuarios, ingresos estimados y auditoría del sistema.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/${locale}/directorio`}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 transition shadow-sm flex items-center gap-2"
            >
              🗺️ Directorio GEO
            </a>
            <Link
              href={`/${locale}`}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-extrabold text-white transition shadow-md flex items-center gap-2"
            >
              🏠 App Principal
            </Link>
          </div>
        </div>

        {/* Dashboard Component */}
        <AdminDashboard
          locale={locale}
          initialTenants={tenants.map((t) => ({
            id: t.id,
            slug: t.slug,
            name: t.name,
            industry: t.industry,
            status: t.status,
            plan: t.plan,
            isTrial: t.isTrial ?? true,
            trialEndsAt: t.trialEndsAt ? t.trialEndsAt.toISOString() : null,
            owner: t.owner,
            provincia: t.provincia,
            canton: t.canton,
            parroquia: t.parroquia,
            comuna: t.comuna,
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
