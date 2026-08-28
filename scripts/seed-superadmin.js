let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch {
  try {
    bcrypt = require('.next/standalone/node_modules/bcryptjs');
  } catch (e) {
    console.warn('[seed-superadmin] ADVERTENCIA: No se pudo cargar el módulo bcryptjs.');
  }
}

let PrismaClient;
const prismaPaths = [
  '../node_modules/.prisma/control',
  './node_modules/.prisma/control',
  '.prisma/control',
  '@prisma/control',
  '.next/standalone/node_modules/.prisma/control'
];
for (const p of prismaPaths) {
  try {
    PrismaClient = require(p).PrismaClient;
    if (PrismaClient) break;
  } catch {}
}

function getControlUrl() {
  return process.env.DATABASE_URL_CONTROL || process.env.DATABASE_URL;
}

async function main() {
  const emailEnv = process.env.SUPER_ADMIN_EMAIL;
  const rawPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!emailEnv || !rawPassword) {
    console.warn(
      '[seed-superadmin] ADVERTENCIA: Variables SUPER_ADMIN_EMAIL y/o SUPER_ADMIN_PASSWORD no definidas. Se omite la creación del superadministrador.'
    );
    return;
  }

  const dbUrl = getControlUrl();
  if (!dbUrl) {
    console.warn(
      '[seed-superadmin] ADVERTENCIA: No se encontró la variable DATABASE_URL_CONTROL ni DATABASE_URL. Se omite el seeding.'
    );
    return;
  }

  if (!PrismaClient || !bcrypt) {
    console.warn('[seed-superadmin] ADVERTENCIA: Módulos PrismaClient o bcryptjs no están disponibles. Se omite el seeding.');
    return;
  }

  const prismaControl = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  try {
    const emails = emailEnv
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    for (const email of emails) {
      console.log(`[seed-superadmin] Configurando superadministrador para: ${email}`);
      const user = await prismaControl.user.upsert({
        where: { email },
        update: {
          role: 'PLATFORM_ADMIN',
          passwordHash,
        },
        create: {
          email,
          name: 'Super Administrator',
          passwordHash,
          role: 'PLATFORM_ADMIN',
        },
      });
      console.log('[seed-superadmin] Superadministrador configurado exitosamente:', {
        id: user.id,
        email: user.email,
        role: user.role,
      });
    }
  } catch (err) {
    console.error(
      '[seed-superadmin] Error durante la ejecución del seed:',
      err.message || 'Error desconocido'
    );
  } finally {
    await prismaControl.$disconnect();
  }
}

main().catch((e) => {
  console.error('[seed-superadmin] Error en la ejecución principal:', e.message || 'Error general');
});
