import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';
import { ensureControlSchema } from '@/lib/db/control';
import {
  isCentralApiEnabled,
  resolveCentralTenantBySlug,
  getCentralResources,
  createCentralResource,
} from '@/lib/central-api';

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  capacity: z.number().int().min(1).default(1),
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
  return { db: getTenantClient(tenant.dbUrl), tenant };
}

function errorResponse(err: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND') {
  const status = err === 'UNAUTHORIZED' ? 401 : err === 'FORBIDDEN' ? 403 : 404;
  return NextResponse.json({ error: err }, { status });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  if (isCentralApiEnabled()) {
    const central = await resolveCentralTenantBySlug(slug);
    if (central) {
      const resources = await getCentralResources(central.branch.id);
      return NextResponse.json({ resources });
    }
  }

  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');
  const resources = await owner.db.resource.findMany({ orderBy: { name: 'asc' } });
  const formattedResources = resources.map((r) => ({
    ...r,
    description: (r.metadata as any)?.description || null,
  }));
  return NextResponse.json({ resources: formattedResources });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });

  if (isCentralApiEnabled()) {
    const session = await auth();
    const accessToken = (session as any)?.accessToken;
    const central = await resolveCentralTenantBySlug(slug);
    if (central && accessToken) {
      const res = await createCentralResource(central.branch.id, parsed.data, accessToken);
      if (res.ok) return NextResponse.json({ resource: res.resource }, { status: 201 });
      return NextResponse.json({ error: res.error || 'Error al crear recurso central' }, { status: 400 });
    }
  }

  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');

  const { checkResourceLimit } = await import('@/lib/plan-guard');
  const guard = await checkResourceLimit(slug);
  if (!guard.allowed) {
    return NextResponse.json(
      { error: 'PLAN_LIMIT_REACHED', message: guard.reason, maxAllowed: guard.maxAllowed },
      { status: 403 }
    );
  }

  const ind = (owner.tenant.industry || 'HOSTAL').toUpperCase();
  const typeMap: Record<string, 'HABITACION' | 'MESA' | 'ASIENTO' | 'CONSULTORIO' | 'SILLA'> = {
    HOSTAL: 'HABITACION',
    GLAMPING: 'HABITACION',
    VACACIONAL: 'HABITACION',
    MASAJE: 'MESA',
    PELUQUERIA: 'SILLA',
    TATUAJE: 'SILLA',
    MEDICO: 'CONSULTORIO',
    VETERINARIA: 'CONSULTORIO',
    RESTAURANTE: 'MESA',
    CATA_TALLER: 'MESA',
    EVENTOS: 'MESA',
    COWORKING: 'MESA',
    CANCHAS: 'MESA',
    TOURS: 'ASIENTO',
    DEPORTES_ACUATICOS: 'ASIENTO',
    PARAPENTE: 'ASIENTO',
    ALQUILER_VEHICULOS: 'ASIENTO',
    CAR_WASH: 'ASIENTO',
  };
  const type = typeMap[ind] ?? 'HABITACION';

  const resource = await owner.db.resource.create({
    data: {
      name: parsed.data.name,
      capacity: parsed.data.capacity,
      metadata: {
        ...(parsed.data.metadata || {}),
        description: parsed.data.description || null,
      },
      type,
    },
  });

  const formattedResource = {
    ...resource,
    description: (resource.metadata as any)?.description || null,
  };

  return NextResponse.json({ resource: formattedResource }, { status: 201 });
}
