import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function DashboardIndex() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;
  const isSuperAdmin = role === 'PLATFORM_ADMIN';

  const tenants = await prismaControl.tenant.findMany({
    where: isSuperAdmin ? {} : { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      owner: {
        select: { email: true, name: true },
      },
    },
  });

  const t = await getTranslations('admin');
  const locale = await getLocale();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          {isSuperAdmin && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 px-3 py-0.5 text-xs font-bold mb-2">
              👑 Vista de Superadministrador (Todos los Negocios)
            </span>
          )}
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {isSuperAdmin ? 'Todos los negocios de la plataforma' : 'Mis negocios'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Selecciona cualquier negocio para entrar en modo asistencia, completar su perfil o editar configuraciones.'
              : 'Gestiona la agenda, servicios, personal y reservas de tus establecimientos.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <Link
              href={`/${locale}/admin`}
              className="rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-800/60 px-4 py-2 text-xs font-bold text-purple-700 dark:text-purple-200 transition shadow-sm"
            >
              ⚙️ Panel Control Plane (/admin)
            </Link>
          )}
          <Link
            href={`/${locale}/sign-up`}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold transition shadow-sm"
          >
            ➕ {t('newTenant')}
          </Link>
        </div>
      </div>

      {tenants.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
          <p className="text-slate-600 dark:text-slate-400 font-medium">Aún no hay negocios registrados en la plataforma.</p>
          <Link href={`/${locale}/sign-up`} className="btn-primary mt-4 inline-block">
            {t('newTenant')}
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg leading-tight">
                      {tenant.name}
                    </h3>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      {tenant.slug}.misreservaciones.com
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      tenant.status === 'ACTIVE'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {tenant.status}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Industria:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 capitalize">{tenant.industry.toLowerCase()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Plan:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{tenant.plan}</span>
                  </div>
                  {isSuperAdmin && tenant.owner && (
                    <div className="flex justify-between text-slate-500 dark:text-slate-400 pt-1">
                      <span>Propietario:</span>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">{tenant.owner.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Link
                  href={`/${locale}/dashboard/${tenant.slug}`}
                  className="w-full text-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs py-2 transition"
                >
                  🚀 Entrar al Panel
                </Link>
                <Link
                  href={`/${locale}/dashboard/${tenant.slug}/perfil`}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold text-xs p-2 transition"
                  title="Editar Perfil"
                >
                  ⚙️
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
