const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../node_modules/.prisma/control');

function getControlUrl() {
  const rawUrl =
    process.env.DATABASE_URL_CONTROL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/misreservaciones_control?schema=public';

  return rawUrl.replace(/postgresql-database-xf0a53c3wv/g, 'xf0a53c3wv9f69ro3wdtyds1');
}

const prismaControl = new PrismaClient({
  datasources: {
    db: {
      url: getControlUrl(),
    },
  },
});

async function main() {
  const email = 'pruebasyaprendizaje0@gmail.com';
  const rawPassword = 'Frhc1971';
  const name = 'Super Administrator';

  console.log(`[seed-superadmin] Configuring Superadmin account: ${email}`);
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const user = await prismaControl.user.upsert({
    where: { email },
    update: {
      role: 'PLATFORM_ADMIN',
      passwordHash,
      name,
    },
    create: {
      email,
      name,
      passwordHash,
      role: 'PLATFORM_ADMIN',
    },
  });

  console.log('[seed-superadmin] Superadmin configured successfully:', {
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

main()
  .catch((e) => {
    console.error('[seed-superadmin] Error:', e);
  })
  .finally(async () => {
    await prismaControl.$disconnect();
  });
