/**
 * Script de inicialización de Superadministrador para PostgreSQL (Vultr / Coolify)
 * Ejecución: node scripts/seed-admin.js [email] [password] [name]
 */

const { PrismaClient } = require('@prisma/control');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL_CONTROL ||
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/misreservaciones_control?schema=public',
    },
  },
});

async function main() {
  const email = (process.argv[2] || process.env.SUPERADMIN_EMAIL || 'fhernandezcalle@gmail.com').toLowerCase().trim();
  const password = process.argv[3] || process.env.SUPERADMIN_PASSWORD || 'Admin123456!';
  const name = process.argv[4] || process.env.SUPERADMIN_NAME || 'Super Admin';

  console.log(`\n👑 [seed-admin] Configurando superadministrador: ${email}`);

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        passwordHash,
        role: 'PLATFORM_ADMIN',
      },
      create: {
        email,
        name,
        passwordHash,
        role: 'PLATFORM_ADMIN',
        locale: 'es',
      },
    });

    console.log(`✅ [seed-admin] Superadministrador listo:`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Rol: ${user.role}`);
    console.log(`   - Nombre: ${user.name}`);
  } catch (err) {
    console.error(`❌ [seed-admin] Error:`, err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
