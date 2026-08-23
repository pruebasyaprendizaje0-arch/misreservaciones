import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { StaffTable } from '@/components/dashboard/StaffTable';
import { SuperadminBanner } from '@/components/dashboard/SuperadminBanner';
import Link from 'next/link';

import { getIndustryConfig } from '@/lib/industries';

export default async function StaffPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const userId = (session.user as { id: string }).id;
  const isSuperAdmin = (session.user as { role?: string }).role === 'PLATFORM_ADMIN';

  const tenant = await prismaControl.tenant.findUnique({
    where: { slug },
    include: { owner: { select: { email: true, name: true } } },
  });
  if (!tenant || (tenant.ownerId !== userId && !isSuperAdmin)) notFound();

  const db = getTenantClient(tenant.dbUrl);
  const staffList = await db.staff.findMany({ orderBy: { name: 'asc' } });

  const config = getIndustryConfig(tenant.industry);
  const rolePlaceholder = config.staffLabel.plural;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {isSuperAdmin && (
          <SuperadminBanner
            tenantName={tenant.name}
            tenantSlug={slug}
            ownerEmail={tenant.owner?.email}
            locale={locale}
          />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">👥 Personal</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {tenant.name} · Gestiona tu equipo de trabajo
              {staffList.length > 0 && ` · ${staffList.length} empleado${staffList.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link
            href={`/${locale}/dashboard/${slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
          >
            ← Volver al Panel
          </Link>
        </div>

        <StaffTable
          slug={slug}
          initial={staffList.map((m) => ({
            id: m.id,
            name: m.name,
            role: m.role,
            email: m.email,
            phone: m.phone,
            active: m.active,
          }))}
        />
      </div>
    </div>
  );
}
