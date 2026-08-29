import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getTenantContext } from '@/lib/tenant-context';
import { isCentralApiEnabled } from '@/lib/central-api';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { getTranslations } from 'next-intl/server';
import { ServicesTable } from '@/components/dashboard/services-table';
import { SuperadminBanner } from '@/components/dashboard/SuperadminBanner';
import { getIndustryConfig } from '@/lib/industries';
import Link from 'next/link';

export default async function ServicesPage({
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

  let services: any[] = [];
  if (ctx.dbUrl) {
    try {
      const db = getTenantClient(ctx.dbUrl);
      services = await db.service.findMany({ orderBy: { createdAt: 'desc' } });
    } catch {}
  }
  const t = await getTranslations('dashboard');

  const config = getIndustryConfig(tenant.industry);
  const titleLabel = config.serviceTitle;

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{titleLabel}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tenant.name} · Configura y edita los precios y duraciones</p>
          </div>
          <Link
            href={`/${locale}/dashboard/${slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
          >
            ← Volver al Panel
          </Link>
        </div>

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
    </div>
  );
}
