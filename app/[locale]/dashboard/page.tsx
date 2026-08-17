import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function DashboardIndex() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const userId = (session.user as { id: string }).id;
  const tenants = await prismaControl.tenant.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
  });

  const t = await getTranslations('admin');
  const locale = await getLocale();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Mis negocios</h1>

      {tenants.length === 0 ? (
        <div className="mt-6 card">
          <p className="text-slate-600">Aún no tienes negocios. Crea uno para empezar.</p>
          <Link href={`/${locale}/sign-up`} className="btn-primary mt-4 inline-block">
            {t('newTenant')}
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {tenants.map((tenant) => (
            <Link
              key={tenant.id}
              href={`/${locale}/dashboard/${tenant.slug}`}
              className="card flex items-center justify-between hover:border-brand-500"
            >
              <div>
                <div className="font-semibold text-slate-900">{tenant.name}</div>
                <div className="text-sm text-slate-500">
                  {tenant.slug}.{process.env.ROOT_DOMAIN || 'tusreservas.com'} · {tenant.industry}
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  tenant.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tenant.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
