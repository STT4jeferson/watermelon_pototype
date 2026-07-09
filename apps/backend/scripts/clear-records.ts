import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearRecords() {
  console.log('Limpando FotoRegistros...');
  await prisma.fotoRegistro.deleteMany({});
  
  console.log('Limpando Registros...');
  await prisma.registro.deleteMany({});
  
  console.log('Banco de registros limpo com sucesso!');
}

clearRecords()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
