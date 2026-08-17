import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { getTranslations } from 'next-intl/server';
import { ServicesTable } from '@/components/dashboard/services-table';

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const userId = (session.user as { id: string }).id;
  const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.ownerId !== userId) notFound();

  const db = getTenantClient(tenant.dbUrl);
  const services = await db.service.findMany({ orderBy: { createdAt: 'desc' } });
  const t = await getTranslations('dashboard');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">{t('services')}</h1>
      <p className="mt-1 text-sm text-slate-500">{tenant.name}</p>
      <div className="mt-6">
        <ServicesTable
          slug={slug}
          industry={tenant.industry as 'HOSTAL' | 'MASAJE' | 'PELUQUERIA' | 'MEDICO'}
          initial={services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            durationMin: s.durationMin,
            priceCents: s.priceCents,
            currency: s.currency,
            active: s.active,
          }))}
        />
      </div>
    </div>
  );
}
