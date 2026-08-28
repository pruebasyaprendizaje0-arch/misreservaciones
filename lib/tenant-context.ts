import { headers } from 'next/headers';
import { prismaControl } from './db/control';
import type { Tenant } from '@prisma/control';
import { isCentralApiEnabled, resolveCentralTenantBySlug, type CentralBusiness, type CentralBranch } from './central-api';

const TENANT_CACHE = new Map<string, { tenant: Tenant; expiresAt: number; centralBusinessId?: string | null; centralBranchId?: string | null }>();

const CACHE_TTL_MS = 5 * 60 * 1000;

export type TenantContext = {
  slug: string | null;
  tenant: Tenant | null;
  dbUrl: string | null;
  centralBusinessId?: string | null;
  centralBranchId?: string | null;
};

/**
 * Mapea un negocio y sucursal de la API Central a la interfaz Tenant de Misreservaciones
 */
function mapCentralToTenant(business: CentralBusiness, branch: CentralBranch): Tenant {
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    industry: business.industry || 'RESTAURANTE',
    dbUrl: '', // No usa base tenant Prisma cuando opera con API Central
    status: 'ACTIVE',
    plan: (business.plan as any) || 'FREE',
    isTrial: false,
    trialEndsAt: null,
    ownerId: business.ownerId || '',
    metadata: null,
    createdAt: new Date(business.createdAt),
    updatedAt: new Date(business.updatedAt),
    provincia: branch.provincia || null,
    canton: branch.city || null,
    parroquia: null,
    comuna: null,
    address: branch.address || null,
    lat: branch.lat || null,
    lng: branch.lng || null,
    phone: branch.phone || business.whatsapp || null,
    description: business.description || null,
    logoUrl: business.logoUrl || null,
    coverUrl: business.coverUrl || null,
  };
}

/**
 * Resolves the tenant for the current request.
 * Reads the subdomain (or ?tenant= override in dev) from the request headers
 * (set by middleware.ts). If USE_CENTRAL_API=true, attempts resolution via Central API.
 * If fallbackSlug is provided, it uses it when the header is not present.
 */
export async function getTenantContext(fallbackSlug?: string): Promise<TenantContext> {
  const headerList = await headers();
  let slug = headerList.get('x-tenant-slug');

  if (!slug && fallbackSlug) {
    slug = fallbackSlug;
  }

  if (!slug) {
    return { slug: null, tenant: null, dbUrl: null, centralBusinessId: null, centralBranchId: null };
  }

  const cached = TENANT_CACHE.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      slug,
      tenant: cached.tenant,
      dbUrl: cached.tenant.dbUrl || null,
      centralBusinessId: cached.centralBusinessId || cached.tenant.id,
      centralBranchId: cached.centralBranchId || null,
    };
  }

  // 1. Intentar resolver mediante API Central si está habilitada
  if (isCentralApiEnabled()) {
    try {
      const centralResult = await resolveCentralTenantBySlug(slug);
      if (centralResult) {
        const tenantMapped = mapCentralToTenant(centralResult.business, centralResult.branch);
        TENANT_CACHE.set(slug, {
          tenant: tenantMapped,
          expiresAt: Date.now() + CACHE_TTL_MS,
          centralBusinessId: centralResult.business.id,
          centralBranchId: centralResult.branch.id,
        });

        return {
          slug,
          tenant: tenantMapped,
          dbUrl: null,
          centralBusinessId: centralResult.business.id,
          centralBranchId: centralResult.branch.id,
        };
      }
    } catch (e) {
      console.warn('[tenant-context] Fallo al resolver tenant desde API Central, usando fallback local Prisma:', e);
    }
  }

  // 2. Fallback a Prisma Control local
  try {
    const tenant = await prismaControl.tenant.findUnique({
      where: { slug },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      return { slug, tenant: null, dbUrl: null, centralBusinessId: null, centralBranchId: null };
    }

    TENANT_CACHE.set(slug, {
      tenant,
      expiresAt: Date.now() + CACHE_TTL_MS,
      centralBusinessId: tenant.id,
      centralBranchId: null,
    });

    return {
      slug,
      tenant,
      dbUrl: tenant.dbUrl,
      centralBusinessId: tenant.id,
      centralBranchId: null,
    };
  } catch (e) {
    console.error('[tenant-context] Error al consultar Prisma Control local:', e);
    return { slug, tenant: null, dbUrl: null, centralBusinessId: null, centralBranchId: null };
  }
}

export function invalidateTenantCache(slug?: string): void {
  if (slug) {
    TENANT_CACHE.delete(slug);
  } else {
    TENANT_CACHE.clear();
  }
}

