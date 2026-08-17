import { PrismaClient } from '@prisma/tenant';

type TenantClient = PrismaClient;

const globalForTenant = globalThis as unknown as {
  tenantCache: Map<string, TenantClient> | undefined;
};

if (!globalForTenant.tenantCache) {
  globalForTenant.tenantCache = new Map<string, TenantClient>();
}

const cache = globalForTenant.tenantCache;

export function getTenantClient(dbUrl: string): TenantClient {
  const existing = cache.get(dbUrl);
  if (existing) return existing;

  const client = new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  cache.set(dbUrl, client);
  return client;
}

export function evictTenantClient(dbUrl: string): void {
  const client = cache.get(dbUrl);
  if (client) {
    void client.$disconnect();
    cache.delete(dbUrl);
  }
}
