"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const empresaA = await prisma.empresa.upsert({
        where: { codigo: 'EMPRESA_A' },
        update: {},
        create: {
            codigo: 'EMPRESA_A',
            nome: 'Empresa A',
            usuarios: {
                create: {
                    keycloakId: '11111111-1111-1111-1111-111111111111',
                    nome: 'João Empresa A',
                    login: 'joao@empresa-a.local'
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
                    nome: 'Maria Empresa B',
                    login: 'maria@empresa-b.local'
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
//# sourceMappingURL=seed.js.map