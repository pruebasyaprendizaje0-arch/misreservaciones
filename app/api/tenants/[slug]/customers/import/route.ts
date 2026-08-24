import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';

const customerImportItemSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(120),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(40).optional().nullable(),
  docId: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string()).optional(),
  nationality: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
});

const importSchema = z.object({
  customers: z.array(customerImportItemSchema).min(1, 'Debe incluir al menos un contacto'),
});

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

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) {
    const status = owner.error === 'UNAUTHORIZED' ? 401 : owner.error === 'FORBIDDEN' ? 403 : 404;
    return NextResponse.json({ error: owner.error }, { status });
  }

  // Feature check for import (same as export feature access check)
  const { checkFeatureAccess } = await import('@/lib/plan-guard');
  const guard = await checkFeatureAccess(slug, 'exportCustomersExcel');
  if (!guard.allowed) {
    return NextResponse.json(
      { error: 'FEATURE_LOCKED', message: guard.reason },
      { status: 403 }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = importSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'INVALID_INPUT', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const items = parsed.data.customers;
  const now = new Date().toISOString();

  try {
    const createdCustomers = await owner.db.$transaction(
      items.map((item, idx) => {
        const cleanName = item.name.trim();
        const cleanEmail = item.email ? item.email.trim() : null;
        const cleanPhone = item.phone ? item.phone.trim() : null;
        const cleanDocId = item.docId ? item.docId.trim() : null;
        const cleanNotes = item.notes ? item.notes.trim() : null;
        const cleanNationality = item.nationality ? item.nationality.trim() : null;
        const cleanCity = item.city ? item.city.trim() : null;
        const cleanAddress = item.address ? item.address.trim() : null;
        const tags = Array.isArray(item.tags) ? item.tags : [];

        return owner.db.customer.create({
          data: {
            name: cleanName,
            email: cleanEmail || null,
            phone: cleanPhone || null,
            notes: cleanNotes || null,
            metadata: {
              docId: cleanDocId || null,
              nationality: cleanNationality || null,
              city: cleanCity || null,
              address: cleanAddress || null,
              status: 'ACTIVE',
              tags: tags,
              interactionLogs: [
                {
                  id: `log_import_${Date.now()}_${idx}`,
                  date: now,
                  type: 'note',
                  note: 'Contacto importado exitosamente via archivo CSV/Excel.',
                  author: 'Sistema (Importación)',
                },
              ],
            },
          },
        });
      })
    );

    return NextResponse.json({
      ok: true,
      count: createdCustomers.length,
      customers: createdCustomers.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        reservations: [],
      })),
    });
  } catch (err: any) {
    console.error('Error al importar clientes:', err);
    return NextResponse.json(
      { error: 'IMPORT_FAILED', message: err.message || 'Error al procesar la importación' },
      { status: 500 }
    );
  }
}
