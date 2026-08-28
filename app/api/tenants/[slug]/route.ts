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

import {
  isCentralApiEnabled,
  resolveCentralTenantBySlug,
  updateCentralBusiness,
  updateCentralBranch,
} from '@/lib/central-api';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    const { slug } = await ctx.params;
    const accessToken = (session as any)?.accessToken;
    const userId = (session.user as { id: string }).id;
    const userRole = (session.user as { role?: string }).role;
    const isAdmin = userRole === 'PLATFORM_ADMIN';

    const json = await req.json().catch(() => null);

    const schema = isAdmin ? fullPatchSchema : ownerPatchSchema;
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      console.error('INVALID PATCH INPUT:', parsed.error.issues);
      return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
    }

    // 1. Si la API Central está activa, actualizar negocio y sucursal centrales
    if (isCentralApiEnabled() && accessToken) {
      const central = await resolveCentralTenantBySlug(slug);
      if (central) {
        const businessPayload: any = {};
        if (parsed.data.name) businessPayload.name = parsed.data.name;
        if (parsed.data.description !== undefined) businessPayload.description = parsed.data.description;
        if (parsed.data.logoUrl !== undefined) businessPayload.logoUrl = parsed.data.logoUrl;
        if (parsed.data.coverUrl !== undefined) businessPayload.coverUrl = parsed.data.coverUrl;
        if (parsed.data.phone !== undefined) businessPayload.whatsapp = parsed.data.phone;

        if (Object.keys(businessPayload).length > 0) {
          await updateCentralBusiness(central.business.id, businessPayload, accessToken);
        }

        const branchPayload: any = {};
        if (parsed.data.address !== undefined) branchPayload.address = parsed.data.address;
        if (parsed.data.canton !== undefined) branchPayload.city = parsed.data.canton;
        if (parsed.data.provincia !== undefined) branchPayload.provincia = parsed.data.provincia;
        if (parsed.data.phone !== undefined) branchPayload.phone = parsed.data.phone;
        if (parsed.data.lat !== undefined) branchPayload.lat = parsed.data.lat;
        if (parsed.data.lng !== undefined) branchPayload.lng = parsed.data.lng;

        if (Object.keys(branchPayload).length > 0) {
          await updateCentralBranch(central.branch.id, branchPayload, accessToken);
        }

        invalidateTenantCache(slug);
        return NextResponse.json({ ok: true, message: 'Perfil central actualizado' });
      }
    }

    // 2. Fallback Prisma Control local
    const tenant = await prismaControl.tenant.findUnique({ where: { slug } });
    if (!tenant) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

    const isOwner = tenant.ownerId === userId;
    if (!isOwner && !isAdmin) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

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
