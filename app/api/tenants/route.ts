import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prismaControl } from '@/lib/db/control';
import { provisionTenant, normalizeSlug, type ProvisionInput } from '@/lib/provisioning';
import { auth } from '@/lib/auth';

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(48),
  industry: z.enum(['HOSTAL', 'MASAJE', 'PELUQUERIA', 'MEDICO']),
  ownerEmail: z.string().email().optional(),
  ownerPassword: z.string().min(8).optional(),
  ownerName: z.string().min(2).max(120).optional(),
});

/**
 * POST /api/tenants
 * Auth: PLATFORM_ADMIN, or first user signing up (creates their owner account).
 * Body: { name, slug, industry, ownerEmail?, ownerPassword?, ownerName? }
 */
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }

  const session = await auth();
  const isPlatformAdmin = session?.user && (session.user as { role?: string }).role === 'PLATFORM_ADMIN';

  let ownerId: string;
  let createdOwner = false;

  if (parsed.data.ownerEmail && parsed.data.ownerPassword) {
    const existing = await prismaControl.user.findUnique({ where: { email: parsed.data.ownerEmail } });
    if (existing) {
      if (!isPlatformAdmin) {
        return NextResponse.json({ error: 'EMAIL_TAKEN' }, { status: 409 });
      }
      ownerId = existing.id;
    } else {
      const passwordHash = await bcrypt.hash(parsed.data.ownerPassword, 10);
      const user = await prismaControl.user.create({
        data: {
          email: parsed.data.ownerEmail,
          name: parsed.data.ownerName ?? parsed.data.name,
          passwordHash,
          role: 'OWNER',
        },
      });
      ownerId = user.id;
      createdOwner = true;
    }
  } else if (isPlatformAdmin && session?.user) {
    ownerId = (session.user as { id: string }).id;
  } else {
    return NextResponse.json({ error: 'OWNER_REQUIRED' }, { status: 400 });
  }

  let slug: string;
  try {
    slug = normalizeSlug(parsed.data.slug);
  } catch {
    return NextResponse.json({ error: 'SLUG_INVALID' }, { status: 400 });
  }

  const input: ProvisionInput = {
    slug,
    name: parsed.data.name,
    industry: parsed.data.industry,
    ownerId,
  };

  try {
    const result = await provisionTenant(input);
    return NextResponse.json({ ...result, createdOwner }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/tenants] provisioning failed', err);
    if (createdOwner) {
      // Roll back the owner user we just created
      try {
        await prismaControl.user.delete({ where: { id: ownerId } });
      } catch (e) {
        console.error('rollback failed', e);
      }
    }
    return NextResponse.json(
      { error: 'PROVISIONING_FAILED', message: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'PLATFORM_ADMIN') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const tenants = await prismaControl.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: { owner: { select: { email: true, name: true } } },
  });
  return NextResponse.json({ tenants });
}
