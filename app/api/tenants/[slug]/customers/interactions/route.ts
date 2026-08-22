import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';

const interactionSchema = z.object({
  customerId: z.string().min(1),
  type: z.enum(['note', 'call', 'whatsapp', 'complaint', 'stay']).default('note'),
  note: z.string().min(1).max(2000),
  authorName: z.string().optional(),
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
  return { db: getTenantClient(tenant.dbUrl), tenant, user: session.user };
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) {
    const status = owner.error === 'UNAUTHORIZED' ? 401 : owner.error === 'FORBIDDEN' ? 403 : 404;
    return NextResponse.json({ error: owner.error }, { status });
  }

  const json = await req.json().catch(() => null);
  const parsed = interactionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }

  const { customerId, type, note, authorName } = parsed.data;

  const existing = await owner.db.customer.findUnique({ where: { id: customerId } });
  if (!existing) {
    return NextResponse.json({ error: 'CUSTOMER_NOT_FOUND' }, { status: 404 });
  }

  const currentMeta = (existing.metadata as Record<string, any>) || {};
  const currentLogs = Array.isArray(currentMeta.interactionLogs) ? currentMeta.interactionLogs : [];

  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    date: new Date().toISOString(),
    type,
    note,
    author: authorName || (owner.user as { name?: string }).name || 'Personal',
  };

  const updatedMeta = {
    ...currentMeta,
    interactionLogs: [newLog, ...currentLogs],
  };

  const updatedCustomer = await owner.db.customer.update({
    where: { id: customerId },
    data: {
      metadata: updatedMeta,
    },
  });

  return NextResponse.json({ ok: true, log: newLog, customer: updatedCustomer }, { status: 201 });
}
