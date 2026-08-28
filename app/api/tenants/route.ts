import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prismaControl, ensureControlSchema } from '@/lib/db/control';
import { provisionTenant, normalizeSlug, type ProvisionInput } from '@/lib/provisioning';
import { auth } from '@/lib/auth';

const RATE_LIMIT_MAP = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const MAX_REGISTRATIONS_PER_IP = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (RATE_LIMIT_MAP.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= MAX_REGISTRATIONS_PER_IP) {
    return true;
  }
  timestamps.push(now);
  RATE_LIMIT_MAP.set(ip, timestamps);
  return false;
}

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(48),
  industry: z.string().min(2).max(50),
  ownerEmail: z.string().email().optional(),
  ownerPassword: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
    .optional(),
  ownerName: z.string().min(2).max(120).optional(),
});

import {
  isCentralApiEnabled,
  createCentralBusiness,
  getCentralBusinesses,
} from '@/lib/central-api';

export async function POST(req: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    const accessToken = (session as any)?.accessToken;
    const isPlatformAdmin = session?.user && (session.user as { role?: string }).role === 'PLATFORM_ADMIN';

    const json = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
    }

    let slug: string;
    try {
      slug = normalizeSlug(parsed.data.slug);
    } catch {
      return NextResponse.json({ error: 'SLUG_INVALID' }, { status: 400 });
    }

    // 1. Si API Central está activa, crear negocio en API Central
    if (isCentralApiEnabled() && accessToken) {
      const centralRes = await createCentralBusiness(
        {
          name: parsed.data.name,
          slug,
          industry: parsed.data.industry,
        },
        accessToken
      );

      if (centralRes.ok && centralRes.business) {
        return NextResponse.json(
          {
            ok: true,
            tenant: {
              id: centralRes.business.id,
              slug: centralRes.business.slug,
              name: centralRes.business.name,
              industry: centralRes.business.industry,
            },
          },
          { status: 201 }
        );
      } else {
        return NextResponse.json(
          { error: 'CENTRAL_CREATION_FAILED', message: centralRes.error || 'No se pudo crear el negocio central' },
          { status: 400 }
        );
      }
    }

    // 2. Fallback local Prisma Control
    await ensureControlSchema();

    let ownerId: string;
    let createdOwner = false;

    if (parsed.data.ownerEmail && parsed.data.ownerPassword) {
      const existing = await prismaControl.user.findUnique({ where: { email: parsed.data.ownerEmail } });
      if (existing) {
        if (!isPlatformAdmin) {
          return NextResponse.json({ error: 'EMAIL_TAKEN', message: 'El correo electrónico ya está registrado' }, { status: 409 });
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
        try {
          await prismaControl.user.delete({ where: { id: ownerId } });
        } catch (e) {}
      }
      return NextResponse.json(
        { error: 'PROVISIONING_FAILED', message: (err as Error).message },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('[POST /api/tenants] top-level handler failed', err);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth().catch(() => null);
    const accessToken = (session as any)?.accessToken;
    if (!session?.user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // 1. Si la API Central está activa, listar negocios centrales
    if (isCentralApiEnabled() && accessToken) {
      const businesses = await getCentralBusinesses(accessToken);
      const mappedTenants = businesses.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        industry: b.industry,
        status: 'ACTIVE',
        plan: b.plan || 'FREE',
        createdAt: b.createdAt,
        owner: { email: session.user?.email || '', name: session.user?.name || '' },
      }));
      return NextResponse.json({ tenants: mappedTenants });
    }

    // 2. Fallback Prisma local
    if ((session.user as { role?: string }).role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    const tenants = await prismaControl.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { owner: { select: { email: true, name: true } } },
    });
    return NextResponse.json({ tenants });
  } catch (err) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: (err as Error).message }, { status: 500 });
  }
}
