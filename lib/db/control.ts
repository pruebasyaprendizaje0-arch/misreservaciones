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
        -- Enums
        BEGIN
          CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN', 'OWNER', 'STAFF', 'CUSTOMER');
        EXCEPTION WHEN duplicate_object THEN null;
        END;

        BEGIN
          CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
        EXCEPTION WHEN duplicate_object THEN null;
        END;

        BEGIN
          CREATE TYPE "TenantPlan" AS ENUM ('FREE', 'PRO', 'BUSINESS');
        EXCEPTION WHEN duplicate_object THEN null;
        END;

        -- Tables
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT PRIMARY KEY,
          "email" TEXT UNIQUE NOT NULL,
          "emailVerified" TIMESTAMP(3),
          "name" TEXT,
          "image" TEXT,
          "passwordHash" TEXT,
          "role" "UserRole" NOT NULL DEFAULT 'OWNER',
          "locale" TEXT NOT NULL DEFAULT 'es',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "Account" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
          "type" TEXT NOT NULL,
          "provider" TEXT NOT NULL,
          "providerAccountId" TEXT NOT NULL,
          "refresh_token" TEXT,
          "access_token" TEXT,
          "expires_at" INTEGER,
          "token_type" TEXT,
          "scope" TEXT,
          "id_token" TEXT,
          "session_state" TEXT,
          UNIQUE ("provider", "providerAccountId")
        );

        CREATE TABLE IF NOT EXISTS "Session" (
          "id" TEXT PRIMARY KEY,
          "sessionToken" TEXT UNIQUE NOT NULL,
          "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
          "expires" TIMESTAMP(3) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "VerificationToken" (
          "identifier" TEXT NOT NULL,
          "token" TEXT UNIQUE NOT NULL,
          "expires" TIMESTAMP(3) NOT NULL,
          UNIQUE ("identifier", "token")
        );

        CREATE TABLE IF NOT EXISTS "Tenant" (
          "id" TEXT PRIMARY KEY,
          "slug" TEXT UNIQUE NOT NULL,
          "name" TEXT NOT NULL,
          "industry" TEXT NOT NULL,
          "dbUrl" TEXT NOT NULL,
          "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
          "plan" "TenantPlan" NOT NULL DEFAULT 'FREE',
          "isTrial" BOOLEAN NOT NULL DEFAULT true,
          "trialEndsAt" TIMESTAMP(3),
          "ownerId" TEXT NOT NULL REFERENCES "User"("id"),
          "metadata" JSONB,
          "provincia" TEXT,
          "canton" TEXT,
          "parroquia" TEXT,
          "comuna" TEXT,
          "address" TEXT,
          "lat" DOUBLE PRECISION,
          "lng" DOUBLE PRECISION,
          "phone" TEXT,
          "description" TEXT,
          "logoUrl" TEXT,
          "coverUrl" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "Subscription" (
          "id" TEXT PRIMARY KEY,
          "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
          "plan" "TenantPlan" NOT NULL,
          "status" TEXT NOT NULL,
          "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
          "externalId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "StaffMember" (
          "id" TEXT PRIMARY KEY,
          "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
          "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
          "role" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE ("tenantId", "userId")
        );

        CREATE TABLE IF NOT EXISTS "AuditLog" (
          "id" TEXT PRIMARY KEY,
          "actorId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
          "action" TEXT NOT NULL,
          "target" TEXT,
          "metadata" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- Tenant Enums and Tables for Unified PostgreSQL Support
        BEGIN
          CREATE TYPE "Industry" AS ENUM (
            'HOSTAL', 'GLAMPING', 'VACACIONAL',
            'MEDICO', 'MASAJE', 'PELUQUERIA', 'TATUAJE', 'VETERINARIA',
            'TOURS', 'DEPORTES_ACUATICOS', 'PARAPENTE',
            'RESTAURANTE', 'CATA_TALLER', 'EVENTOS',
            'ALQUILER_VEHICULOS', 'CANCHAS', 'COWORKING', 'CAR_WASH'
          );
        EXCEPTION WHEN duplicate_object THEN null;
        END;

        BEGIN
          CREATE TYPE "ResourceType" AS ENUM ('HABITACION', 'MESA', 'ASIENTO', 'CONSULTORIO', 'SILLA');
        EXCEPTION WHEN duplicate_object THEN null;
        END;

        BEGIN
          CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
        EXCEPTION WHEN duplicate_object THEN null;
        END;

        BEGIN
          CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED', 'CANCELLED');
        EXCEPTION WHEN duplicate_object THEN null;
        END;

        CREATE TABLE IF NOT EXISTS "Service" (
          "id" TEXT PRIMARY KEY,
          "industry" "Industry" NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "durationMin" INTEGER NOT NULL,
          "priceCents" INTEGER NOT NULL DEFAULT 0,
          "currency" TEXT NOT NULL DEFAULT 'USD',
          "capacity" INTEGER NOT NULL DEFAULT 1,
          "active" BOOLEAN NOT NULL DEFAULT true,
          "metadata" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "Resource" (
          "id" TEXT PRIMARY KEY,
          "type" "ResourceType" NOT NULL,
          "name" TEXT NOT NULL,
          "capacity" INTEGER NOT NULL DEFAULT 1,
          "active" BOOLEAN NOT NULL DEFAULT true,
          "metadata" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "Staff" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "email" TEXT,
          "phone" TEXT,
          "role" TEXT,
          "active" BOOLEAN NOT NULL DEFAULT true,
          "metadata" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "StaffService" (
          "staffId" TEXT NOT NULL REFERENCES "Staff"("id") ON DELETE CASCADE,
          "serviceId" TEXT NOT NULL REFERENCES "Service"("id") ON DELETE CASCADE,
          PRIMARY KEY ("staffId", "serviceId")
        );

        CREATE TABLE IF NOT EXISTS "Customer" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "email" TEXT,
          "phone" TEXT,
          "locale" TEXT NOT NULL DEFAULT 'es',
          "notes" TEXT,
          "medicalData" JSONB,
          "metadata" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "Reservation" (
          "id" TEXT PRIMARY KEY,
          "customerId" TEXT NOT NULL REFERENCES "Customer"("id"),
          "serviceId" TEXT NOT NULL REFERENCES "Service"("id"),
          "resourceId" TEXT REFERENCES "Resource"("id") ON DELETE SET NULL,
          "staffId" TEXT REFERENCES "Staff"("id") ON DELETE SET NULL,
          "startsAt" TIMESTAMP(3) NOT NULL,
          "endsAt" TIMESTAMP(3) NOT NULL,
          "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
          "source" TEXT NOT NULL DEFAULT 'web',
          "notes" TEXT,
          "metadata" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "AvailabilityRule" (
          "id" TEXT PRIMARY KEY,
          "staffId" TEXT REFERENCES "Staff"("id") ON DELETE CASCADE,
          "weekday" INTEGER NOT NULL,
          "startMin" INTEGER NOT NULL,
          "endMin" INTEGER NOT NULL,
          "active" BOOLEAN NOT NULL DEFAULT true
        );

        CREATE TABLE IF NOT EXISTS "AvailabilityException" (
          "id" TEXT PRIMARY KEY,
          "staffId" TEXT REFERENCES "Staff"("id") ON DELETE CASCADE,
          "date" DATE NOT NULL,
          "blocked" BOOLEAN NOT NULL DEFAULT true,
          "startMin" INTEGER,
          "endMin" INTEGER,
          "reason" TEXT
        );

        CREATE TABLE IF NOT EXISTS "Payment" (
          "id" TEXT PRIMARY KEY,
          "reservationId" TEXT NOT NULL REFERENCES "Reservation"("id") ON DELETE CASCADE,
          "amountCents" INTEGER NOT NULL,
          "currency" TEXT NOT NULL DEFAULT 'USD',
          "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
          "provider" TEXT,
          "externalId" TEXT,
          "metadata" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "Setting" (
          "key" TEXT PRIMARY KEY,
          "value" JSONB NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- Columns migration check
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
      END $$;
    `);
    schemaEnsured = true;
  } catch (err) {
    console.warn('[prismaControl] schema ensure warning:', err);
  }
}
