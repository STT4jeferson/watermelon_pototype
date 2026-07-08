"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRoutes = syncRoutes;
const prisma_1 = require("../../infra/prisma");
const keycloak_auth_middleware_1 = require("../../infra/auth/keycloak/keycloak-auth.middleware");
async function syncRoutes(app) {
    // Pull Changes Endpoint
    app.get('/sync/pull', { preHandler: [keycloak_auth_middleware_1.keycloakAuthMiddleware] }, async (request, reply) => {
        const query = request.query;
        const lastPulledAt = query.lastPulledAt && query.lastPulledAt !== 'null' ? parseInt(query.lastPulledAt, 10) : 0;
        const userContext = request.userContext;
        const since = new Date(lastPulledAt);
        const empresaId = userContext.empresaId;
        const pullChanges = async (modelDelegate, whereClause) => {
            const created = await modelDelegate.findMany({
                where: { ...whereClause, createdAt: { gt: since }, deletedAt: null },
            });
            const updated = await modelDelegate.findMany({
                where: { ...whereClause, updatedAt: { gt: since }, createdAt: { lte: since }, deletedAt: null },
            });
            const deletedRecords = await modelDelegate.findMany({
                where: { ...whereClause, deletedAt: { gt: since } },
                select: { id: true }
            });
            return {
                created,
                updated,
                deleted: deletedRecords.map((r) => String(r.id)),
            };
        };
        const changes = {
            empresas: await pullChanges(prisma_1.prisma.empresa, { id: empresaId }),
            usuarios: await pullChanges(prisma_1.prisma.usuario, { empresaId }),
            registros: await pullChanges(prisma_1.prisma.registro, { empresaId }),
            foto_registros: await pullChanges(prisma_1.prisma.fotoRegistro, { empresaId }),
        };
        return {
            changes,
            timestamp: Date.now(),
        };
    });
    // Push Changes Endpoint
    app.post('/sync/push', { preHandler: [keycloak_auth_middleware_1.keycloakAuthMiddleware] }, async (request, reply) => {
        const userContext = request.userContext;
        const body = request.body;
        const changes = body.changes || {};
        await prisma_1.prisma.$transaction(async (tx) => {
            // REGISTROS
            if (changes.registros) {
                const { created, updated, deleted } = changes.registros;
                for (const record of created || []) {
                    await tx.registro.create({
                        data: {
                            id: record.id,
                            empresaId: userContext.empresaId, // Forçado do contexto
                            usuarioId: userContext.usuarioId, // Forçado do contexto
                            tipo: record.tipo,
                            dataHora: new Date(record.data_hora || record.dataHora),
                            descricao: record.descricao,
                        }
                    });
                }
                for (const record of updated || []) {
                    await tx.registro.updateMany({
                        where: { id: record.id, empresaId: userContext.empresaId },
                        data: {
                            tipo: record.tipo,
                            dataHora: new Date(record.data_hora || record.dataHora),
                            descricao: record.descricao,
                        }
                    });
                }
                for (const id of deleted || []) {
                    await tx.registro.updateMany({
                        where: { id, empresaId: userContext.empresaId },
                        data: { deletedAt: new Date() }
                    });
                }
            }
            // FOTO REGISTROS
            if (changes.foto_registros) {
                const { created, updated, deleted } = changes.foto_registros;
                for (const record of created || []) {
                    await tx.fotoRegistro.create({
                        data: {
                            id: record.id,
                            registroId: record.registro_id || record.registroId,
                            empresaId: userContext.empresaId, // Forçado
                            usuarioId: userContext.usuarioId, // Forçado
                            localPath: record.local_path || record.localPath,
                            remoteUrl: record.remote_url || record.remoteUrl,
                            mimeType: record.mime_type || record.mimeType,
                            fileName: record.file_name || record.fileName,
                        }
                    });
                }
                for (const record of updated || []) {
                    await tx.fotoRegistro.updateMany({
                        where: { id: record.id, empresaId: userContext.empresaId },
                        data: {
                            localPath: record.local_path || record.localPath,
                            remoteUrl: record.remote_url || record.remoteUrl,
                            mimeType: record.mime_type || record.mimeType,
                            fileName: record.file_name || record.fileName,
                        }
                    });
                }
                for (const id of deleted || []) {
                    await tx.fotoRegistro.updateMany({
                        where: { id, empresaId: userContext.empresaId },
                        data: { deletedAt: new Date() }
                    });
                }
            }
        });
        return reply.status(200).send({ success: true });
    });
}
//# sourceMappingURL=routes.js.map