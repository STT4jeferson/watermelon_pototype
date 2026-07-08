import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Limpando dados antigos (garantindo ambiente zerado para testes)...');
  await prisma.fotoRegistro.deleteMany({});
  await prisma.registro.deleteMany({});
  // Usuários e empresas serão atualizados pelo upsert para manter a amarração do Keycloak

  const empresaA = await prisma.empresa.upsert({
    where: { codigo: 'EMPRESA_A' },
    update: {},
    create: {
      codigo: 'EMPRESA_A',
      nome: 'Empresa A',
      usuarios: {
        create: {
          keycloakId: '11111111-1111-1111-1111-111111111111',
          nome: 'João Teste',
          login: 'joao@teste.com'
        },
      },
    },
  });

  const empresaB = await prisma.empresa.upsert({
    where: { codigo: 'EMPRESA_B' },
    update: {},
    create: {
      codigo: 'EMPRESA_B',
      nome: 'Empresa B',
      usuarios: {
        create: {
          keycloakId: '22222222-2222-2222-2222-222222222222',
          nome: 'Maria Teste',
          login: 'maria@teste.com'
        },
      },
    },
  });

  console.log('Seed concluído com usuários integrados ao Keycloak:', { empresaA, empresaB });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });