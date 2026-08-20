import { PrismaClient } from '@prisma/control';

const globalForControl = globalThis as unknown as {
  prismaControl: PrismaClient | undefined;
};

function getControlUrl(): string {
  const rawUrl =
    process.env.DATABASE_URL_CONTROL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/misreservaciones_control?schema=public';

  // Fix internal Coolify hostname if present
  return rawUrl.replace(/postgresql-database-xf0a53c3wv/g, 'xf0a53c3wv9f69ro3wdtyds1');
}

export const prismaControl =
  globalForControl.prismaControl ??
  new PrismaClient({
    datasources: { db: { url: getControlUrl() } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForControl.prismaControl = prismaControl;
}
