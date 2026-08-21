const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../node_modules/.prisma/control');

function getControlUrl() {
  return (
    process.env.DATABASE_URL_CONTROL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/misreservaciones_control?schema=public'
  );
}

const prismaControl = new PrismaClient({
  datasources: {
    db: {
      url: getControlUrl(),
    },
  },
});

async function main() {
  const superadmins = [
    { email: 'fhernandezcalle@gmail.com', name: 'Frank Hernández (Superadmin)' },
    { email: 'pruebasyaprendizaje0@gmail.com', name: 'Super Administrator' },
  ];
  const rawPassword = 'Frhc1971';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  for (const sa of superadmins) {
    console.log(`[seed-superadmin] Configuring Superadmin account: ${sa.email}`);
    const user = await prismaControl.user.upsert({
      where: { email: sa.email },
      update: {
        role: 'PLATFORM_ADMIN',
        passwordHash,
        name: sa.name,
      },
      create: {
        email: sa.email,
        name: sa.name,
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
}

main()
  .catch((e) => {
    console.error('[seed-superadmin] Error:', e);
  })
  .finally(async () => {
    await prismaControl.$disconnect();
  });
