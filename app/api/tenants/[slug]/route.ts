import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prismaControl } from '@/lib/db/control';
import { auth } from '@/lib/auth';
import { deleteTenant } from '@/lib/provisioning';
import { invalidateTenantCache } from '@/lib/tenant-context';

const adminPatchSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']).optional(),
  plan: z.enum(['FREE', 'PRO', 'BUSINESS']).optional(),
  isTrial: z.boolean().optional(),
  trialEndsAt: z.string().optional().nullable().transform((v) => (v ? new Date(v) : null)),
});


// Fields editable by the tenant owner (and admins)
const ownerPatchSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(5000).optional().nullable(),
  phone: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  provincia: z.string().max(100).optional().nullable(),
  canton: z.string().max(100).optional().nullable(),
  parroquia: z.string().max(100).optional().nullable(),
  comuna: z.string().max(100).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  metadata: z.any().optional().nullable(),
});

const fullPatchSchema = adminPatchSchema.merge(ownerPatchSchema);

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
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

    const schema = isAdmin ? fullPatchSchema : ownerPatchSchema;
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      console.error('INVALID PATCH INPUT:', parsed.error.issues);
      return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
    }

    const updated = await prismaControl.tenant.update({
      where: { slug },
      data: parsed.data,
    });

    invalidateTenantCache(slug);

    return NextResponse.json({ tenant: updated });
  } catch (error: any) {
    console.error('Error al actualizar perfil de tenant:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al actualizar perfil' },
      { status: 500 }
    );
  }
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
