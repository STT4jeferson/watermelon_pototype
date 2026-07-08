import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashPassword = await bcrypt.hash('123456', 10);

  let empresaA = await prisma.empresa.findFirst({ where: { usuarios: { some: { login: 'usuario_a' } } } });
  if (!empresaA) {
    empresaA = await prisma.empresa.create({
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
  }

  let empresaB = await prisma.empresa.findFirst({ where: { usuarios: { some: { login: 'usuario_b' } } } });
  if (!empresaB) {
    empresaB = await prisma.empresa.create({
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
  }

  let empresaC = await prisma.empresa.findFirst({ where: { usuarios: { some: { login: 'usuario_c' } } } });
  if (!empresaC) {
    empresaC = await prisma.empresa.create({
      data: {
        nome: 'Empresa C',
        usuarios: {
          create: {
            nome: 'Usuário Empresa C',
            login: 'usuario_c',
            senha: hashPassword,
          },
        },
      },
    });
  }

  console.log('Seed concluído:', { empresaA, empresaB, empresaC });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
