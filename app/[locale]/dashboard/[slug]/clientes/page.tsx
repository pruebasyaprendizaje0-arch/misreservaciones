import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { CustomerDirectory } from '@/components/dashboard/CustomerDirectory';
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
  const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.ownerId !== userId) notFound();

  const db = getTenantClient(tenant.dbUrl);

  const customers = await db.customer.findMany({
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

  const term = {
    title: tenant.industry === 'MEDICO' ? 'Pacientes' : tenant.industry === 'HOSTAL' ? 'Huéspedes' : 'Clientes',
    desc: tenant.industry === 'MEDICO'
      ? 'CRM e historias clínicas de pacientes'
      : tenant.industry === 'HOSTAL'
      ? 'CRM y control de huéspedes'
      : 'CRM y perfiles 360° de clientes',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-8">
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
            reservations: c.reservations.map((r) => ({
              id: r.id,
              startsAt: r.startsAt.toISOString(),
              status: r.status,
              service: r.service,
              staff: r.staff,
              payments: r.payments,
            })),
          }))}
          industry={tenant.industry}
        />
      </div>
    </div>
  );
}
