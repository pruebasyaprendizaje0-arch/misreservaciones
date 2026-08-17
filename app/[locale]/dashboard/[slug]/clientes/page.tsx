import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { CustomerDirectory } from '@/components/dashboard/CustomerDirectory';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';

export default async function ClientesPage({
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
  
  // Fetch all customers with their reservations
  const customers = await db.customer.findMany({
    orderBy: { name: 'asc' },
    include: {
      reservations: {
        select: {
          id: true,
          startsAt: true,
          status: true,
          service: { select: { name: true } },
          staff: { select: { name: true } },
        },
        orderBy: { startsAt: 'desc' },
      },
    },
  });

  const term = {
    title: tenant.industry === 'MEDICO' ? 'Pacientes' : tenant.industry === 'HOSTAL' ? 'Huéspedes' : 'Clientes',
    desc: tenant.industry === 'MEDICO' 
      ? 'Listado e historias clínicas de pacientes' 
      : tenant.industry === 'HOSTAL' 
      ? 'Control y registro de huéspedes' 
      : 'Gestión y perfiles de clientes',
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">👥 Gestión de {term.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {tenant.name} · {term.desc}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${locale}/dashboard/${slug}`} className="btn-secondary text-sm">
            ← Panel
          </Link>
        </div>
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
          reservations: c.reservations.map((r) => ({
            id: r.id,
            startsAt: r.startsAt.toISOString(),
            status: r.status,
            service: r.service,
            staff: r.staff,
          })),
        }))}
        industry={tenant.industry}
      />
    </div>
  );
}
