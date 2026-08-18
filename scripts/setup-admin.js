const { PrismaClient } = require('../node_modules/.prisma/control');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const email = 'pruebasyaprendizaje0@gmail.com';
  const password = 'Frhc1971';
  
  console.log(`Hasheando contraseña para ${email}...`);
  const passwordHash = await bcrypt.hash(password, 10);
  
  console.log(`Buscando/creando usuario ${email} en la base de datos de control...`);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'PLATFORM_ADMIN',
    },
    create: {
      email,
      name: 'Superusuario Plataforma',
      passwordHash,
      role: 'PLATFORM_ADMIN',
    },
  });

  console.log('✅ Superusuario configurado exitosamente:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Rol: ${user.role}`);
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Error al configurar el superusuario:', err);
  process.exit(1);
});
