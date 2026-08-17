import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { StaffTable } from '@/components/dashboard/StaffTable';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';

const INDUSTRY_ROLE_PLACEHOLDER: Record<string, string> = {
  HOSTAL: 'Recepcionista, Ama de llaves, Conserje',
  MASAJE: 'Masajista, Terapeuta, Recepcionista',
  PELUQUERIA: 'Estilista, Barbero, Colorista',
  MEDICO: 'Doctor, Enfermera, Secretaria',
};

export default async function StaffPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const userId = (session.user as { id: string }).id;
  const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.ownerId !== userId) notFound();

  const db = getTenantClient(tenant.dbUrl);
  const staffList = await db.staff.findMany({ orderBy: { name: 'asc' } });

  const rolePlaceholder = INDUSTRY_ROLE_PLACEHOLDER[tenant.industry] ?? 'Empleado';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">👥 Personal</h1>
          <p className="text-sm text-slate-500 mt-1">
            {tenant.name} · Gestiona tu equipo de trabajo
            {staffList.length > 0 && ` · ${staffList.length} empleado${staffList.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link href={`/${locale}/dashboard/${slug}`} className="btn-secondary text-sm">
          ← Panel
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
  );
}
