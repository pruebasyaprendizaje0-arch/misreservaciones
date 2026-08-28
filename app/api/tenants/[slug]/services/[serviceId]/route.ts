import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  durationMin: z.number().int().min(5).max(24 * 60).optional(),
  priceCents: z.number().int().min(0).optional(),
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

import {
  isCentralApiEnabled,
  updateCentralService,
  deleteCentralService,
} from '@/lib/central-api';

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string; serviceId: string }> }
) {
  const { slug, serviceId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });

  if (isCentralApiEnabled()) {
    const session = await auth();
    const accessToken = (session as any)?.accessToken;
    if (accessToken) {
      const res = await updateCentralService(serviceId, parsed.data, accessToken);
      if (res.ok) return NextResponse.json({ service: res.service });
      return NextResponse.json({ error: res.error || 'Error al actualizar servicio central' }, { status: 400 });
    }
  }

  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');

  try {
    const service = await owner.db.service.update({
      where: { id: serviceId },
      data: parsed.data,
    });
    return NextResponse.json({ service });
  } catch {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string; serviceId: string }> }
) {
  const { slug, serviceId } = await ctx.params;

  if (isCentralApiEnabled()) {
    const session = await auth();
    const accessToken = (session as any)?.accessToken;
    if (accessToken) {
      const res = await deleteCentralService(serviceId, accessToken);
      if (res.ok) return NextResponse.json({ ok: true });
      return NextResponse.json({ error: res.error || 'Error al eliminar servicio central' }, { status: 400 });
    }
  }

  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');

  try {
    await owner.db.service.delete({ where: { id: serviceId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
}
