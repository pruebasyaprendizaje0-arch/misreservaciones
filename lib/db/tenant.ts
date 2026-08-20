import { PrismaClient } from '@prisma/tenant';

type TenantClient = PrismaClient;

const globalForTenant = globalThis as unknown as {
  tenantCache: Map<string, TenantClient> | undefined;
};

if (!globalForTenant.tenantCache) {
  globalForTenant.tenantCache = new Map<string, TenantClient>();
}

const cache = globalForTenant.tenantCache;

function getControlHost(): string | null {
  const controlUrl = process.env.DATABASE_URL_CONTROL || process.env.DATABASE_URL;
  if (!controlUrl) return null;
  try {
    const parsed = new URL(controlUrl);
    return parsed.hostname;
  } catch {
    return null;
  }
}

export function getTenantClient(dbUrl: string): TenantClient {
  let sanitized = dbUrl.replace(/postgresql-database-xf0a53c3wv/g, 'xf0a53c3wv9f69ro3wdtyds1');
  const controlHost = getControlHost();

  if (controlHost && process.env.NODE_ENV === 'production') {
    try {
      const parsed = new URL(sanitized);
      if (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname.includes('postgresql-database')
      ) {
        parsed.hostname = controlHost;
        sanitized = parsed.toString();
      }
    } catch {
      // Keep sanitized if parsing fails
    }
  }

  const existing = cache.get(sanitized);
  if (existing) return existing;

  // Optimize connection pool size per tenant to prevent exhaustion
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
  let sanitized = dbUrl.replace(/postgresql-database-xf0a53c3wv/g, 'xf0a53c3wv9f69ro3wdtyds1');
  const controlHost = getControlHost();

  if (controlHost && process.env.NODE_ENV === 'production') {
    try {
      const parsed = new URL(sanitized);
      if (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname.includes('postgresql-database')
      ) {
        parsed.hostname = controlHost;
        sanitized = parsed.toString();
      }
    } catch {}
  }

  const client = cache.get(sanitized);
  if (client) {
    void client.$disconnect();
    cache.delete(sanitized);
  }
}
