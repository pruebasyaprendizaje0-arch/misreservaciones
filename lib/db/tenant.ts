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
  // Sanitize internal Coolify display hostname
  const sanitized = dbUrl.replace(/postgresql-database-xf0a53c3wv/g, 'xf0a53c3wv9f69ro3wdtyds1');
  const existing = cache.get(sanitized);
  if (existing) return existing;

  // Optimize pool size per tenant to prevent connection exhaustion
  let url = sanitized;
  if (!url.includes('connection_limit')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}connection_limit=3`;
  }

  const client = new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  cache.set(sanitized, client);
  return client;
}

export function evictTenantClient(dbUrl: string): void {
  const sanitized = dbUrl.replace(/postgresql-database-xf0a53c3wv/g, 'xf0a53c3wv9f69ro3wdtyds1');
  const client = cache.get(sanitized);
  if (client) {
    void client.$disconnect();
    cache.delete(sanitized);
  }
}
