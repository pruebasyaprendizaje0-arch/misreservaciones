import { PrismaClient } from '@prisma/control';

const globalForControl = globalThis as unknown as {
  prismaControl: PrismaClient | undefined;
};

function getControlUrl(): string {
  const url = process.env.DATABASE_URL_CONTROL;
  if (!url || url.includes('xf0a53c3wv9f69ro3wdtyds1')) {
    return 'postgresql://postgres:postgres@localhost:5432/misreservaciones_control?schema=public';
  }
  return url;
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
