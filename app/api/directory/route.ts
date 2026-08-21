import { NextResponse, type NextRequest } from 'next/server';
import { prismaControl } from '@/lib/db/control';

/**
 * GET /api/directory
 * Public endpoint — returns active tenants for the directory search.
 * Query params: provincia, canton, parroquia, q (text search)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const provincia = searchParams.get('provincia') || undefined;
    const canton = searchParams.get('canton') || undefined;
    const parroquia = searchParams.get('parroquia') || undefined;
    const q = searchParams.get('q')?.trim() || undefined;
    const industry = searchParams.get('industry') || undefined;

    try {
      await prismaControl.$executeRawUnsafe(`
        ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "isTrial" BOOLEAN DEFAULT true;
        ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
        ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "comuna" TEXT;
      `);
    } catch {}

    const tenants = await prismaControl.tenant.findMany({
      where: {
        status: 'ACTIVE',
        ...(provincia ? { provincia } : {}),
        ...(canton ? { canton } : {}),
        ...(parroquia ? { parroquia } : {}),
        ...(industry ? { industry } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { canton: { contains: q, mode: 'insensitive' } },
                { provincia: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        // Explicitly exclude dbUrl for security
        id: true,
        slug: true,
        name: true,
        industry: true,
        description: true,
        phone: true,
        address: true,
        provincia: true,
        canton: true,
        parroquia: true,
        lat: true,
        lng: true,
        logoUrl: true,
        plan: true,
        createdAt: true,
      },
      orderBy: [
        { plan: 'desc' }, // PRO/BUSINESS businesses first
        { name: 'asc' },
      ],
      take: 100,
    });

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error('[/api/directory] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al cargar el directorio',
        detail: (error as Error)?.message || String(error),
      },
      { status: 500 }
    );
  }
}
