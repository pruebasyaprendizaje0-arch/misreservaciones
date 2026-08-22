import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';

async function resolveOwnerDb(slug: string) {
  const session = await auth();
  if (!session?.user) return { error: 'UNAUTHORIZED' as const };
  const userId = (session.user as { id: string }).id;
  const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
  if (!tenant) return { error: 'NOT_FOUND' as const };
  const isOwner = tenant.ownerId === userId;
  const isAdmin = (session.user as { role?: string }).role === 'PLATFORM_ADMIN';
  if (!isOwner && !isAdmin) return { error: 'FORBIDDEN' as const };
  return { db: getTenantClient(tenant.dbUrl), tenant };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) {
    const status = owner.error === 'UNAUTHORIZED' ? 401 : owner.error === 'FORBIDDEN' ? 403 : 404;
    return NextResponse.json({ error: owner.error }, { status });
  }

  const customers = await owner.db.customer.findMany({
    orderBy: { name: 'asc' },
    include: {
      reservations: {
        select: {
          id: true,
          startsAt: true,
          status: true,
          service: { select: { priceCents: true } },
          payments: { select: { amountCents: true, status: true } },
        },
      },
    },
  });

  const term = owner.tenant.industry === 'HOSTAL' ? 'Huesped' : owner.tenant.industry === 'MEDICO' ? 'Paciente' : 'Cliente';

  // Build CSV content
  const headers = [
    'ID',
    'Nombre',
    'Documento / Cedula',
    'Telefono',
    'Email',
    'Estado',
    'Etiquetas',
    'Nacionalidad',
    'Contacto Emergencia',
    'Total Reservas',
    'Reservas Completadas',
    'Total Gastado (USD)',
    'Fecha Registro',
  ];

  const rows = customers.map((c) => {
    const meta = (c.metadata as Record<string, any>) || {};
    const tags = Array.isArray(meta.tags) ? meta.tags.join('; ') : '';
    const status = meta.status || 'ACTIVE';

    // Calculate total spent
    let totalSpentCents = 0;
    let completedCount = 0;
    c.reservations.forEach((r) => {
      if (r.status === 'COMPLETED' || r.status === 'CONFIRMED' || r.status === 'CHECKED_IN') {
        completedCount++;
        const paidPayment = r.payments.find((p) => p.status === 'PAID');
        if (paidPayment) {
          totalSpentCents += paidPayment.amountCents;
        } else if (r.service?.priceCents) {
          totalSpentCents += r.service.priceCents;
        }
      }
    });

    const totalSpentUSD = (totalSpentCents / 100).toFixed(2);

    return [
      `"${c.id}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(meta.docId || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${status}"`,
      `"${tags.replace(/"/g, '""')}"`,
      `"${(meta.nationality || '').replace(/"/g, '""')}"`,
      `"${(meta.emergencyContact || '').replace(/"/g, '""')}"`,
      c.reservations.length,
      completedCount,
      totalSpentUSD,
      `"${new Date(c.createdAt).toLocaleDateString('es-EC')}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n'); // Add BOM for Excel UTF-8

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}-crm-${term.toLowerCase()}s-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
