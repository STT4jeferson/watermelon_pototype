import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashPassword = await bcrypt.hash('123456', 10);

  const empresaA = await prisma.empresa.create({
    data: {
      nome: 'Empresa A',
      usuarios: {
        create: {
          nome: 'Usuário Empresa A',
          login: 'usuario_a',
          senha: hashPassword,
        },
      },
    },
  });

  const empresaB = await prisma.empresa.create({
    data: {
      nome: 'Empresa B',
      usuarios: {
        create: {
          nome: 'Usuário Empresa B',
          login: 'usuario_b',
          senha: hashPassword,
        },
      },
    },
  });

  console.log('Seed concluído:', { empresaA, empresaB });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });