import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prismaControl } from '@/lib/db/control';
import { getTenantClient } from '@/lib/db/tenant';

const ruleSchema = z.object({
  weekday: z.number().min(0).max(6),
  startMin: z.number().min(0).max(1440),
  endMin: z.number().min(0).max(1440),
  active: z.boolean(),
  staffId: z.string().nullable().optional(),
});

const bulkSchema = z.object({
  rules: z.array(ruleSchema),
  staffId: z.string().nullable().optional(),
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

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');

  const staffIdParam = req.nextUrl.searchParams.get('staffId');
  const staffId = staffIdParam === 'business' || !staffIdParam ? null : staffIdParam;

  const rules = await owner.db.availabilityRule.findMany({
    where: { staffId },
    orderBy: { weekday: 'asc' },
  });

  return NextResponse.json({ rules });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const owner = await resolveOwnerDb(slug);
  if ('error' in owner) return errorResponse(owner.error as 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND');

  const json = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }

  const { rules, staffId: targetStaffId } = parsed.data;
  const effectiveStaffId = targetStaffId || null;

  // Delete existing rules for this target (business or specific staff)
  await owner.db.availabilityRule.deleteMany({
    where: { staffId: effectiveStaffId },
  });

  // Create new active rules
  const created = await owner.db.availabilityRule.createMany({
    data: rules.map((r) => ({
      staffId: effectiveStaffId,
      weekday: r.weekday,
      startMin: r.startMin,
      endMin: r.endMin,
      active: r.active,
    })),
  });

  const updatedRules = await owner.db.availabilityRule.findMany({
    where: { staffId: effectiveStaffId },
    orderBy: { weekday: 'asc' },
  });

  return NextResponse.json({ success: true, count: created.count, rules: updatedRules });
}
