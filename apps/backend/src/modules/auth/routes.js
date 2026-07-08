"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const prisma_1 = require("../../infra/prisma");
const keycloak_auth_middleware_1 = require("../../infra/auth/keycloak/keycloak-auth.middleware");
async function authRoutes(app) {
    // A rota de login via POST /auth/login e validação de bcrypt foi REMOVIDA 
    // O aplicativo utilizará OAuth2 no client mobile para autenticar no Keycloak
    // Rota de Perfil Protegida para retornar as informações do usuário atual
    app.get('/me', { preHandler: [keycloak_auth_middleware_1.keycloakAuthMiddleware] }, async (request, reply) => {
        const userContext = request.userContext;
        // Pode retornar o dado vindo do DB se preferir carregar dados mais completos
        const usuario = await prisma_1.prisma.usuario.findUnique({
            where: { id: userContext.usuarioId },
            include: { empresa: true },
        });
        if (!usuario) {
            return reply.status(404).send({ error: 'Usuário não encontrado' });
        }
        return {
            id: usuario.id,
            keycloakId: usuario.keycloakId,
            nome: usuario.nome,
            login: usuario.login,
            empresa: {
                id: usuario.empresa.id,
                codigo: usuario.empresa.codigo,
                nome: usuario.empresa.nome,
            },
        };
    });
}
//# sourceMappingURL=routes.js.map