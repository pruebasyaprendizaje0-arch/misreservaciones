import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  durationMin: z.number().int().min(1).max(30 * 24 * 60),
  priceCents: z.number().int().min(0),
  industry: z.string().min(2).max(50),
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
  return { dbUrl: tenant.dbUrl, db: getTenantClient(tenant.dbUrl) };
}

import {
  isCentralApiEnabled,
  resolveCentralTenantBySlug,
  getCentralServices,
  createCentralService,
} from '@/lib/central-api';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  if (isCentralApiEnabled()) {
    const central = await resolveCentralTenantBySlug(slug);
    if (central) {
      const services = await getCentralServices(central.branch.id);
      return NextResponse.json({ services });
    }
  }

  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) {
    const status = owner.error === 'UNAUTHORIZED' ? 401 : owner.error === 'FORBIDDEN' ? 403 : 404;
    return NextResponse.json({ error: owner.error }, { status });
  }
  const services = await owner.db.service.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json({ services });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    console.log('SERVICE VALIDATION FAILURE:', parsed.error.format());
    return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }

  if (isCentralApiEnabled()) {
    const session = await auth();
    const accessToken = (session as any)?.accessToken;
    const central = await resolveCentralTenantBySlug(slug);
    if (central && accessToken) {
      const res = await createCentralService(central.branch.id, parsed.data, accessToken);
      if (res.ok) return NextResponse.json({ service: res.service }, { status: 201 });
      return NextResponse.json({ error: res.error || 'Error al crear servicio central' }, { status: 400 });
    }
  }

  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) {
    const status = owner.error === 'UNAUTHORIZED' ? 401 : owner.error === 'FORBIDDEN' ? 403 : 404;
    return NextResponse.json({ error: owner.error }, { status });
  }

  const { checkServiceLimit } = await import('@/lib/plan-guard');
  const guard = await checkServiceLimit(slug);
  if (!guard.allowed) {
    return NextResponse.json(
      { error: 'PLAN_LIMIT_REACHED', message: guard.reason, maxAllowed: guard.maxAllowed },
      { status: 403 }
    );
  }

  const service = await owner.db.service.create({ data: parsed.data as any });
  return NextResponse.json({ service }, { status: 201 });
}
