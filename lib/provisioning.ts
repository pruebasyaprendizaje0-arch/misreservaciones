import { Client as PgClient } from 'pg';
import { randomBytes } from 'node:crypto';
import { prismaControl } from './db/control';

export type ProvisionInput = {
  slug: string;
  name: string;
  industry: 'HOSTAL' | 'MASAJE' | 'PELUQUERIA' | 'MEDICO';
  ownerId: string;
};

export type ProvisionResult = {
  tenantId: string;
  slug: string;
  dbUrl: string;
  url: string;
};

const SLUG_RESERVED = new Set(['www', 'app', 'admin', 'api', 'static', 'mail', 'cdn']);

export function normalizeSlug(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  if (!base) throw new Error('SLUG_INVALID');
  if (SLUG_RESERVED.has(base)) throw new Error('SLUG_RESERVED');
  return base;
}

function generatePassword(): string {
  return randomBytes(24).toString('base64url');
}

function getAdminUrl(): string {
  const url =
    process.env.POSTGRES_ADMIN_URL ||
    process.env.DATABASE_URL_CONTROL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@xf0a53c3wv9f69ro3wdtyds1:5432/postgres';

  // Fix internal Coolify hostname if present
  return url.replace(/postgresql-database-xf0a53c3wv/g, 'xf0a53c3wv9f69ro3wdtyds1');
}

function buildDbUrl(slug: string, password: string): string {
  const adminUrl = getAdminUrl();
  const url = new URL(adminUrl);
  const host = url.hostname;
  const port = url.port || '5432';
  const dbName = `mr_tenant_${slug.replace(/-/g, '_')}`;

  return `postgresql://mr_${slug.replace(/-/g, '_')}:${encodeURIComponent(password)}@${host}:${port}/${dbName}?schema=public`;
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let i = 1;
  while (await prismaControl.tenant.findUnique({ where: { slug: candidate } })) {
    i += 1;
    candidate = `${base}-${i}`;
    if (i > 100) throw new Error('SLUG_EXHAUSTED');
  }
  return candidate;
}

const TENANT_DDL = `
DO $$ BEGIN
  CREATE TYPE "Industry" AS ENUM ('HOSTAL', 'MASAJE', 'PELUQUERIA', 'MEDICO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ResourceType" AS ENUM ('HABITACION', 'MESA', 'ASIENTO', 'CONSULTORIO', 'SILLA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

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
`;

/**
 * Provisions a new tenant:
 *   1. Generates unique slug + secure password.
 *   2. Connects to Postgres as admin and creates role + database.
 *   3. Applies tenant DDL natively via SQL.
 *   4. Inserts a Tenant row in the control DB.
 *   5. Seeds default settings.
 */
export async function provisionTenant(input: ProvisionInput): Promise<ProvisionResult> {
  const baseSlug = normalizeSlug(input.slug);
  const slug = await ensureUniqueSlug(baseSlug);
  const password = generatePassword();
  const dbUrl = buildDbUrl(slug, password);
  const dbName = `mr_tenant_${slug.replace(/-/g, '_')}`;
  const role = `mr_${slug.replace(/-/g, '_')}`;

  const adminUrl = getAdminUrl();
  const admin = new PgClient({ connectionString: adminUrl });
  await admin.connect();
  try {
    // Idempotent role creation

    const checkRole = await admin.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [role]);
    if (checkRole.rowCount === 0) {
      await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password.replace(/'/g, "''")}'`);
    } else {
      await admin.query(`ALTER ROLE "${role}" WITH LOGIN PASSWORD '${password.replace(/'/g, "''")}'`);
    }

    // Idempotent database creation
    const checkDb = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (checkDb.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${dbName}" OWNER "${role}"`);
    }
  } finally {
    await admin.end();
  }


  // Connect to the newly created database as admin to execute DDL
  const tenantAdminUrl = adminUrl.replace(/\/[^/]+(\?.*)?$/, `/${dbName}$1`);
  const tenantClient = new PgClient({ connectionString: tenantAdminUrl });
  await tenantClient.connect();
  try {
    await tenantClient.query(TENANT_DDL);
    await tenantClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${role}"`);
    await tenantClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${role}"`);
    await tenantClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${role}"`);
  } finally {

    await tenantClient.end();
  }

  // 30 days free trial calculation
  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Insert into control DB
  const tenant = await prismaControl.tenant.create({
    data: {
      slug,
      name: input.name,
      industry: input.industry,
      dbUrl,
      ownerId: input.ownerId,
      isTrial: true,
      trialEndsAt,
    },
  });

  // Seed default settings and demo data via the tenant Prisma client
  const { getTenantClient } = await import('./db/tenant');
  const tenantDb = getTenantClient(dbUrl);
  await tenantDb.setting.createMany({
    data: [
      { key: 'timezone', value: process.env.APP_TIMEZONE || 'America/Santo_Domingo' },
      { key: 'locale', value: process.env.DEFAULT_LOCALE || 'es' },
      { key: 'currency', value: 'USD' },
      {
        key: 'business_hours',
        value: {
          weekday: { open: '09:00', close: '18:00' },
          saturday: { open: '09:00', close: '14:00' },
          sunday: null,
        },
      },
      { key: 'cancellation_hours', value: 24 },
    ],
  });

  // Seed initial demo service & staff for immediate testing
  try {
    const demoServiceNames: Record<string, { name: string; desc: string; price: number; duration: number }> = {
      HOSTAL: { name: 'Habitación Matrimonial (Demo)', desc: 'Cama matrimonial, aire acondicionado, baño privado y vista al jardín.', price: 3500, duration: 1440 },
      MASAJE: { name: 'Masaje Terapéutico Relajante (Demo)', desc: 'Sesión de relajación muscular completa de 60 minutos.', price: 3000, duration: 60 },
      PELUQUERIA: { name: 'Corte de Cabello & Barba (Demo)', desc: 'Servicio completo de estilización y corte.', price: 1500, duration: 45 },
      MEDICO: { name: 'Consulta Médica General (Demo)', desc: 'Evaluación de salud integral y prescripción.', price: 2500, duration: 30 },
    };

    const sInfo = demoServiceNames[input.industry] || demoServiceNames.HOSTAL;
    const demoService = await tenantDb.service.create({
      data: {
        industry: input.industry,
        name: sInfo.name,
        description: sInfo.desc,
        durationMin: sInfo.duration,
        priceCents: sInfo.price,
        currency: 'USD',
        active: true,
      },
    });

    const demoStaff = await tenantDb.staff.create({
      data: {
        name: 'Personal de Atención (Demo)',
        role: 'Encargado Principal',
        active: true,
      },
    });

    await tenantDb.staffService.create({
      data: {
        staffId: demoStaff.id,
        serviceId: demoService.id,
      },
    });

    if (input.industry === 'HOSTAL') {
      await tenantDb.resource.createMany({
        data: [
          { type: 'HABITACION', name: 'Habitación 101 - Matrimonial', capacity: 2, active: true },
          { type: 'HABITACION', name: 'Habitación 102 - Doble Twin', capacity: 3, active: true },
        ],
      });
    }
  } catch (seedErr) {
    console.warn('[provisionTenant] Demo seed non-critical error:', seedErr);
  }


  const rootDomain = process.env.ROOT_DOMAIN || 'ubicame.cc';
  return {
    tenantId: tenant.id,
    slug,
    dbUrl,
    url: `https://${slug}.${rootDomain}`,
  };
}

export async function suspendTenant(tenantId: string): Promise<void> {
  await prismaControl.tenant.update({
    where: { id: tenantId },
    data: { status: 'SUSPENDED' },
  });
}

export async function deleteTenant(tenantId: string): Promise<void> {
  const tenant = await prismaControl.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return;

  const adminUrl = getAdminUrl();
  const admin = new PgClient({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
  try {
    await admin.connect();
    const dbName = `mr_tenant_${tenant.slug.replace(/-/g, '_')}`;
    const role = `mr_${tenant.slug.replace(/-/g, '_')}`;
    await admin.query(`REVOKE CONNECT ON DATABASE "${dbName}" FROM PUBLIC`);
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
      [dbName]
    );
    await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await admin.query(`DROP ROLE IF EXISTS "${role}"`);
  } catch (err) {
    console.error('[deleteTenant] DB cleanup failed', err);
  } finally {
    await admin.end();
  }

  await prismaControl.tenant.delete({ where: { id: tenantId } });
}
