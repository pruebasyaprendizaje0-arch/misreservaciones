import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { ensureControlSchema } from '@/lib/db/control';
import {
  isCentralApiEnabled,
  updateCentralResource,
  deleteCentralResource,
} from '@/lib/central-api';

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  capacity: z.number().int().min(1).optional(),
  active: z.boolean().optional(),
  metadata: z.any().optional().nullable(),
});

async function resolveOwnerDb(slug: string) {
  const session = await auth();
  if (!session?.user) return { error: 'UNAUTHORIZED' as const };
  await ensureControlSchema();

  const userId = (session.user as { id: string }).id;
  const userRole = (session.user as { role?: string }).role;
  const userEmail = session.user.email?.toLowerCase().trim() || '';

  const superAdminEmails = [
    'pruebasyaprendizaje0@gmail.com',
    'fhernandezcalle@gmail.com',
    process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim(),
  ].filter(Boolean);

  const isAdmin = userRole === 'PLATFORM_ADMIN' || superAdminEmails.includes(userEmail);
  const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
  if (!tenant) return { error: 'NOT_FOUND' as const };
  const isOwner = tenant.ownerId === userId;
  if (!isOwner && !isAdmin) return { error: 'FORBIDDEN' as const };
  return { db: getTenantClient(tenant.dbUrl) };
}

function errorResponse(err: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND') {
  const status = err === 'UNAUTHORIZED' ? 401 : err === 'FORBIDDEN' ? 403 : 404;
  return NextResponse.json({ error: err }, { status });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string; resourceId: string }> }
) {
  const { slug, resourceId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });

  if (isCentralApiEnabled()) {
    const session = await auth();
    const accessToken = (session as any)?.accessToken;
    if (accessToken) {
      const res = await updateCentralResource(resourceId, parsed.data, accessToken);
      if (res.ok) return NextResponse.json({ resource: res.resource });
      return NextResponse.json({ error: res.error || 'Error al actualizar recurso central' }, { status: 400 });
    }
  }

  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');

  try {
    const existing = await owner.db.resource.findUnique({ where: { id: resourceId } });
    if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const currentMetadata = (existing.metadata as Record<string, any>) || {};
    const newMetadata = {
      ...currentMetadata,
      ...(parsed.data.metadata || {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
    };

    const updateData: any = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.capacity !== undefined) updateData.capacity = parsed.data.capacity;
    if (parsed.data.active !== undefined) updateData.active = parsed.data.active;
    updateData.metadata = newMetadata;

    const resource = await owner.db.resource.update({
      where: { id: resourceId },
      data: updateData,
    });

    const formatted = {
      ...resource,
      description: (resource.metadata as any)?.description || null,
    };

    return NextResponse.json({ resource: formatted });
  } catch {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string; resourceId: string }> }
) {
  const { slug, resourceId } = await ctx.params;

  if (isCentralApiEnabled()) {
    const session = await auth();
    const accessToken = (session as any)?.accessToken;
    if (accessToken) {
      const res = await deleteCentralResource(resourceId, accessToken);
      if (res.ok) return NextResponse.json({ ok: true });
      return NextResponse.json({ error: res.error || 'Error al eliminar recurso central' }, { status: 400 });
    }
  }

  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');

  try {
    await owner.db.resource.delete({ where: { id: resourceId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
}
