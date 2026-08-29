import { NextResponse, type NextRequest } from 'next/server';
import { prismaControl } from '@/lib/db/control';
import { getCentralBusinesses } from '@/lib/central-api';

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
    const comuna = searchParams.get('comuna') || undefined;
    const q = searchParams.get('q')?.trim() || undefined;
    const industry = searchParams.get('industry') || undefined;

    let rawBusinesses: any[] = [];
    try {
      rawBusinesses = await getCentralBusinesses();
    } catch (err) {
      console.warn('[/api/directory] Warning: Central API fetch failed:', err);
    }

    if (rawBusinesses.length === 0) {
      try {
        const localTenants = await prismaControl.tenant.findMany({
          where: { status: 'ACTIVE' },
          select: {
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
            comuna: true,
            lat: true,
            lng: true,
            logoUrl: true,
            plan: true,
            createdAt: true,
          },
          orderBy: [{ plan: 'desc' }, { name: 'asc' }],
          take: 100,
        });
        if (localTenants && localTenants.length > 0) {
          rawBusinesses = localTenants;
        }
      } catch (e) {
        console.warn('[/api/directory] Warning: Local Prisma fallback failed:', e);
      }
    }

    const tenants = rawBusinesses
      .map((b) => {
        const primaryBranch = b.branches && b.branches.length > 0 ? b.branches[0] : null;
        return {
          id: b.id,
          slug: b.slug,
          name: b.name,
          industry: b.industry || 'RESTAURANTE',
          description: b.description || null,
          phone: primaryBranch?.phone || b.phone || b.whatsapp || null,
          address: primaryBranch?.address || b.address || null,
          provincia: primaryBranch?.provincia || b.provincia || null,
          canton: primaryBranch?.city || b.canton || null,
          parroquia: b.parroquia || null,
          comuna: b.comuna || null,
          lat: primaryBranch?.lat || b.lat || null,
          lng: primaryBranch?.lng || b.lng || null,
          logoUrl: b.logoUrl || null,
          plan: b.plan || 'FREE',
          createdAt: b.createdAt || new Date().toISOString(),
        };
      })
      .filter((t) => {
        if (industry && t.industry.toUpperCase() !== industry.toUpperCase()) return false;
        if (provincia && t.provincia && !t.provincia.toLowerCase().includes(provincia.toLowerCase())) return false;
        if (canton && t.canton && !t.canton.toLowerCase().includes(canton.toLowerCase())) return false;
        if (q && q.trim()) {
          const searchTerm = q.trim().toLowerCase();
          const matchesName = t.name.toLowerCase().includes(searchTerm);
          const matchesDesc = t.description ? t.description.toLowerCase().includes(searchTerm) : false;
          const matchesAddress = t.address ? t.address.toLowerCase().includes(searchTerm) : false;
          const matchesCanton = t.canton ? t.canton.toLowerCase().includes(searchTerm) : false;
          const matchesProvincia = t.provincia ? t.provincia.toLowerCase().includes(searchTerm) : false;
          if (!matchesName && !matchesDesc && !matchesAddress && !matchesCanton && !matchesProvincia) return false;
        }
        return true;
      });

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error('[/api/directory] Error:', error);
    // Return empty list with HTTP 200 instead of 500 error to keep client alive
    return NextResponse.json({ tenants: [], warning: 'Falló la consulta al directorio' });
  }
}

