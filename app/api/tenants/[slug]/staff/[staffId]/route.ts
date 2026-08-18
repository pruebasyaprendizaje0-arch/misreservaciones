import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  role: z.string().max(80).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  active: z.boolean().optional(),
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
  return { db: getTenantClient(tenant.dbUrl) };
}

function errorResponse(err: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND') {
  const status = err === 'UNAUTHORIZED' ? 401 : err === 'FORBIDDEN' ? 403 : 404;
  return NextResponse.json({ error: err }, { status });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string; staffId: string }> }
) {
  const { slug, staffId } = await ctx.params;
  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });

  try {
    const member = await owner.db.staff.update({ where: { id: staffId }, data: parsed.data });
    return NextResponse.json({ member });
  } catch {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string; staffId: string }> }
) {
  const { slug, staffId } = await ctx.params;
  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');

  try {
    await owner.db.staff.delete({ where: { id: staffId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
}
