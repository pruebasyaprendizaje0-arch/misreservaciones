import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';

const createSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  medicalData: z.any().optional().nullable(),
  metadata: z.any().optional().nullable(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  medicalData: z.any().optional().nullable(),
  metadata: z.any().optional().nullable(),
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

function errorResponse(err: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND') {
  const status = err === 'UNAUTHORIZED' ? 401 : err === 'FORBIDDEN' ? 403 : 404;
  return NextResponse.json({ error: err }, { status });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');

  const customers = await owner.db.customer.findMany({
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

  return NextResponse.json({ customers, industry: owner.tenant.industry });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }

  const customer = await owner.db.customer.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
      medicalData: parsed.data.medicalData ?? undefined,
      metadata: parsed.data.metadata ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, customer }, { status: 201 });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }

  const { id, ...data } = parsed.data;

  const existing = await owner.db.customer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'CUSTOMER_NOT_FOUND' }, { status: 404 });
  }

  const updated = await owner.db.customer.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      notes: data.notes || null,
      ...(data.medicalData !== undefined ? { medicalData: data.medicalData ?? undefined } : {}),
      ...(data.metadata !== undefined ? { metadata: data.metadata ?? undefined } : {}),
    },
  });

  return NextResponse.json({ customer: updated });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    await owner.db.customer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
  }
}
