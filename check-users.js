const { PrismaClient } = require('.prisma/control');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({ 
    select: { id: true, slug: true, ownerId: true, name: true } 
  });
  console.log('Tenants:', JSON.stringify(tenants, null, 2));
  
  const users = await prisma.user.findMany({ 
    select: { id: true, email: true } 
  });
  console.log('Users:', JSON.stringify(users, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);
