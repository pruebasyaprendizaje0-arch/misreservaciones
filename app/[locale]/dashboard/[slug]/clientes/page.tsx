import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getTenantContext } from '@/lib/tenant-context';
import { isCentralApiEnabled } from '@/lib/central-api';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { CustomerDirectory } from '@/components/dashboard/CustomerDirectory';
import { SuperadminBanner } from '@/components/dashboard/SuperadminBanner';
import { getIndustryConfig } from '@/lib/industries';
import Link from 'next/link';

export default async function ClientesPage({
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

  let customers: any[] = [];
  if (ctx.dbUrl) {
    try {
      const db = getTenantClient(ctx.dbUrl);
      customers = await db.customer.findMany({
        orderBy: { name: 'asc' },
        include: {
          reservations: {
            select: {
              id: true,
              startsAt: true,
              status: true,
              service: { select: { name: true, priceCents: true } },
              staff: { select: { name: true } },
              payments: { select: { amountCents: true, status: true } },
            },
            orderBy: { startsAt: 'desc' },
          },
        },
      });
    } catch {}
  }

  const config = getIndustryConfig(tenant.industry);
  const term = {
    title: config.customerLabel.plural,
    desc: `CRM y gestión 360° de ${config.customerLabel.plural.toLowerCase()}`,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-8">
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
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <span>👥</span> CRM & Gestión de {term.title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {tenant.name} · {term.desc}
            </p>
          </div>
          <Link
            href={`/${locale}/dashboard/${slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
          >
            ← Volver al Panel
          </Link>
        </div>

        <CustomerDirectory
          slug={slug}
          initialCustomers={customers.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            notes: c.notes,
            medicalData: c.medicalData,
            metadata: c.metadata,
            createdAt: c.createdAt.toISOString(),
            reservations: (c.reservations || []).map((r: any) => ({
              id: r.id,
              startsAt: r.startsAt ? new Date(r.startsAt).toISOString() : new Date().toISOString(),
              status: r.status,
              service: r.service,
              staff: r.staff,
              payments: r.payments,
            })),
          }))}
          industry={tenant.industry}
          plan={tenant.plan}
        />
      </div>
    </div>
  );
}
