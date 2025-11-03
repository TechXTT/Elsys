/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@elsys.bg';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = 'Admin';

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, password: hash, role: 'ADMIN' },
    create: { email, name, password: hash, role: 'ADMIN' },
  });

  console.log('Admin user ensured:', { id: user.id, email: user.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
