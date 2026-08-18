import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  capacity: z.number().int().min(1).default(1),
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
  const resources = await owner.db.resource.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ resources });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });

  const typeMap: Record<string, 'HABITACION' | 'MESA' | 'ASIENTO' | 'CONSULTORIO' | 'SILLA'> = {
    HOSTAL: 'HABITACION',
    MASAJE: 'MESA',
    PELUQUERIA: 'SILLA',
    MEDICO: 'CONSULTORIO',
  };
  const type = typeMap[owner.tenant.industry] ?? 'MESA';

  const resource = await owner.db.resource.create({
    data: {
      name: parsed.data.name,
      capacity: parsed.data.capacity,
      type,
    },
  });
  return NextResponse.json({ resource }, { status: 201 });
}
