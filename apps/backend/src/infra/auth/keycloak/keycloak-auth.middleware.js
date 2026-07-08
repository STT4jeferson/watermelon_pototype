"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keycloakAuthMiddleware = keycloakAuthMiddleware;
const keycloak_jwt_validator_1 = require("./keycloak-jwt.validator");
const client_1 = require("@prisma/client");
require("./authenticated-user.context"); // import para tipagem
const prisma = new client_1.PrismaClient();
async function keycloakAuthMiddleware(request, reply) {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.status(401).send({ error: 'Token não fornecido ou inválido' });
        }
        const token = authHeader.split(' ')[1];
        // 1. Valida o JWT contra o Keycloak
        const decodedToken = await (0, keycloak_jwt_validator_1.validateToken)(token);
        const keycloakId = decodedToken.sub;
        if (!keycloakId || typeof keycloakId !== 'string') {
            return reply.status(401).send({ error: 'Token sem identificação (sub) válida' });
        }
        // 2. Busca o usuário no MySQL baseado no keycloak_id
        const usuarioDb = await prisma.usuario.findUnique({
            where: { keycloakId },
            include: { empresa: true },
        });
        if (!usuarioDb || usuarioDb.deletedAt) {
            return reply.status(403).send({ error: 'Usuário sem permissão de domínio (vínculo inexistente)' });
        }
        // 3. Monta o contexto para os endpoints protegidos
        request.userContext = {
            keycloakId: usuarioDb.keycloakId,
            usuarioId: usuarioDb.id,
            empresaId: usuarioDb.empresaId,
            login: usuarioDb.login,
            nome: usuarioDb.nome,
        };
    }
    catch (err) {
        request.log.error(err);
        return reply.status(401).send({ error: 'Falha na validação do token', details: err.message });
    }
}
//# sourceMappingURL=keycloak-auth.middleware.js.map