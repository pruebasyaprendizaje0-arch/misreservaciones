import { headers } from 'next/headers';
import { prismaControl } from './db/control';
import type { Tenant } from '@prisma/control';

const TENANT_CACHE = new Map<string, { tenant: Tenant; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export type TenantContext = {
  slug: string | null;
  tenant: Tenant | null;
  dbUrl: string | null;
};

/**
 * Resolves the tenant for the current request.
 * Reads the subdomain (or ?tenant= override in dev) from the request headers
 * (set by middleware.ts) and looks up the tenant in the control DB.
 * If fallbackSlug is provided, it uses it when the header is not present.
 */
export async function getTenantContext(fallbackSlug?: string): Promise<TenantContext> {
  const headerList = await headers();
  let slug = headerList.get('x-tenant-slug');

  if (!slug && fallbackSlug) {
    slug = fallbackSlug;
  }

  if (!slug) {
    return { slug: null, tenant: null, dbUrl: null };
  }

  const cached = TENANT_CACHE.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return { slug, tenant: cached.tenant, dbUrl: cached.tenant.dbUrl };
  }

  try {
    await prismaControl.$executeRawUnsafe(`
      ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "isTrial" BOOLEAN DEFAULT true;
      ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
      ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "comuna" TEXT;
    `);
  } catch {}

  const tenant = await prismaControl.tenant.findUnique({
    where: { slug },
  });

  if (!tenant || tenant.status !== 'ACTIVE') {
    return { slug, tenant: null, dbUrl: null };
  }

  TENANT_CACHE.set(slug, {
    tenant,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return { slug, tenant, dbUrl: tenant.dbUrl };
}

export function invalidateTenantCache(slug?: string): void {
  if (slug) {
    TENANT_CACHE.delete(slug);
  } else {
    TENANT_CACHE.clear();
  }
}
