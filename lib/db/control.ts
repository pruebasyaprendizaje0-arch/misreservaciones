import { PrismaClient } from '@prisma/control';

const globalForControl = globalThis as unknown as {
  prismaControl: PrismaClient | undefined;
};

function getSanitizedControlUrl(): string | undefined {
  const url = process.env.DATABASE_URL_CONTROL;
  if (!url) return undefined;
  // Replace internal Coolify display hostname with the actual working Docker container hostname
  return url.replace(/postgresql-database-xf0a53c3wv/g, 'xf0a53c3wv9f69ro3wdtyds1');
}

const sanitizedUrl = getSanitizedControlUrl();

export const prismaControl =
  globalForControl.prismaControl ??
  new PrismaClient({
    ...(sanitizedUrl ? { datasources: { db: { url: sanitizedUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForControl.prismaControl = prismaControl;
}
