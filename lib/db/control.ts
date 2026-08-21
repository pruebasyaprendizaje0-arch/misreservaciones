import { PrismaClient } from '@prisma/control';

const globalForControl = globalThis as unknown as {
  prismaControl: PrismaClient | undefined;
};

function getControlUrl(): string {
  return (
    process.env.DATABASE_URL_CONTROL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/misreservaciones_control?schema=public'
  );
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

let schemaEnsured = false;

export async function ensureControlSchema(): Promise<void> {
  if (schemaEnsured) return;
  try {
    await prismaControl.$executeRawUnsafe(`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "isTrial" BOOLEAN DEFAULT true;
          ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
          ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "comuna" TEXT;
          ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "provincia" TEXT;
          ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "canton" TEXT;
          ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "parroquia" TEXT;
          ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "phone" TEXT;
          ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "description" TEXT;
          ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
          ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "coverUrl" TEXT;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
          ALTER TABLE tenant ADD COLUMN IF NOT EXISTS "isTrial" BOOLEAN DEFAULT true;
          ALTER TABLE tenant ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
          ALTER TABLE tenant ADD COLUMN IF NOT EXISTS comuna TEXT;
          ALTER TABLE tenant ADD COLUMN IF NOT EXISTS provincia TEXT;
          ALTER TABLE tenant ADD COLUMN IF NOT EXISTS canton TEXT;
          ALTER TABLE tenant ADD COLUMN IF NOT EXISTS parroquia TEXT;
          ALTER TABLE tenant ADD COLUMN IF NOT EXISTS phone TEXT;
          ALTER TABLE tenant ADD COLUMN IF NOT EXISTS description TEXT;
          ALTER TABLE tenant ADD COLUMN IF NOT EXISTS logoUrl TEXT;
          ALTER TABLE tenant ADD COLUMN IF NOT EXISTS coverUrl TEXT;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END $$;
    `);
    schemaEnsured = true;
  } catch (err) {
    console.warn('[prismaControl] schema ensure warning:', err);
  }
}
