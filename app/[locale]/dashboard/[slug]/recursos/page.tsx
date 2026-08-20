import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { ResourcesTable } from '@/components/dashboard/ResourcesTable';
import Link from 'next/link';

const RESOURCE_LABEL: Record<string, string> = {
  HOSTAL: 'Habitación',
  MASAJE: 'Cabina / Camilla',
  PELUQUERIA: 'Silla / Puesto',
  MEDICO: 'Consultorio',
};

export default async function RecursosPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const userId = (session.user as { id: string }).id;
  const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.ownerId !== userId) notFound();

  const db = getTenantClient(tenant.dbUrl);
  const resources = await db.resource.findMany({ orderBy: { name: 'asc' } });

  const label = RESOURCE_LABEL[tenant.industry] ?? 'Recurso';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">🔑 {label}s</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {tenant.name} · Gestiona los espacios o recursos disponibles
              {resources.length > 0 && ` · ${resources.length} ${label.toLowerCase()}${resources.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link
            href={`/${locale}/dashboard/${slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
          >
            ← Volver al Panel
          </Link>
        </div>

        <ResourcesTable
          slug={slug}
          industryLabel={label}
          initial={resources.map((r) => ({
            id: r.id,
            name: r.name,
            description: null,
            capacity: r.capacity,
            active: r.active,
          }))}
        />
      </div>
    </div>
  );
}
