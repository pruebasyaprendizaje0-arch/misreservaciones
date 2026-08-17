import { Client as PgClient } from 'pg';
import { randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';
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
    .replace(/[̀-ͯ]/g, '')
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

function buildDbUrl(slug: string, password: string): string {
  const adminUrl = process.env.POSTGRES_ADMIN_URL;
  if (!adminUrl) throw new Error('POSTGRES_ADMIN_URL not set');

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

/**
 * Provisions a new tenant:
 *   1. Generates unique slug + secure password.
 *   2. Connects to Postgres as admin and creates role + database.
 *   3. Runs Prisma migrations against the new database.
 *   4. Inserts a Tenant row in the control DB.
 *   5. Seeds default settings (timezone, locale, business hours).
 *
 * Requires:
 *   - POSTGRES_ADMIN_URL with CREATEDB privilege.
 *   - prisma CLI available in the runtime image.
 */
export async function provisionTenant(input: ProvisionInput): Promise<ProvisionResult> {
  const baseSlug = normalizeSlug(input.slug);
  const slug = await ensureUniqueSlug(baseSlug);
  const password = generatePassword();
  const dbUrl = buildDbUrl(slug, password);
  const dbName = `mr_tenant_${slug.replace(/-/g, '_')}`;
  const role = `mr_${slug.replace(/-/g, '_')}`;

  const adminUrl = process.env.POSTGRES_ADMIN_URL!;
  const admin = new PgClient({ connectionString: adminUrl });
  await admin.connect();
  try {
    // Idempotent role/db creation
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password.replace(/'/g, "''")}'`);
    await admin.query(`CREATE DATABASE "${dbName}" OWNER "${role}"`);
  } finally {
    await admin.end();
  }

  // Run db push to create tables against the new database
  execSync('npx prisma db push --schema=prisma/schema.tenant.prisma --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'inherit',
  });

  // Insert into control DB
  const tenant = await prismaControl.tenant.create({
    data: {
      slug,
      name: input.name,
      industry: input.industry,
      dbUrl,
      ownerId: input.ownerId,
    },
  });

  // Seed default settings via the tenant Prisma client
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

  const rootDomain = process.env.ROOT_DOMAIN || 'tusreservas.com';
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

  const adminUrl = process.env.POSTGRES_ADMIN_URL;
  if (adminUrl) {
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
  }

  await prismaControl.tenant.delete({ where: { id: tenantId } });
}
