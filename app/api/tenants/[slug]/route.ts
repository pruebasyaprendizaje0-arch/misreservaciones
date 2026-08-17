import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prismaControl } from '@/lib/db/control';
import { auth } from '@/lib/auth';
import { deleteTenant } from '@/lib/provisioning';
import { invalidateTenantCache } from '@/lib/tenant-context';

// Fields editable only by platform admins
const adminPatchSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']).optional(),
  plan: z.enum(['FREE', 'PRO', 'BUSINESS']).optional(),
});

// Fields editable by the tenant owner (and admins)
const ownerPatchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  provincia: z.string().max(80).optional().nullable(),
  canton: z.string().max(80).optional().nullable(),
  parroquia: z.string().max(80).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  coverUrl: z.string().url().optional().nullable(),
});

const fullPatchSchema = adminPatchSchema.merge(ownerPatchSchema);

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { slug } = await ctx.params;
  const userId = (session.user as { id: string }).id;
  const userRole = (session.user as { role?: string }).role;
  const isAdmin = userRole === 'PLATFORM_ADMIN';

  const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const isOwner = tenant.ownerId === userId;
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const json = await req.json().catch(() => null);

  // Owners can only update owner fields; admins can update everything
  const schema = isAdmin ? fullPatchSchema : ownerPatchSchema;
  const parsed = schema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });

  const updated = await prismaControl.tenant.update({
    where: { slug },
    data: parsed.data,
  });

  // Bust in-memory cache so the updated name / location shows immediately
  invalidateTenantCache(slug);

  return NextResponse.json({ tenant: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'PLATFORM_ADMIN') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const { slug } = await ctx.params;
  await deleteTenant(slug);
  return NextResponse.json({ ok: true });
}
