"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fotoRoutes = fotoRoutes;
const prisma_1 = require("../../infra/prisma");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const stream_1 = require("stream");
const keycloak_auth_middleware_1 = require("../../infra/auth/keycloak/keycloak-auth.middleware");
const pump = util_1.default.promisify(stream_1.pipeline);
const uploadDir = path_1.default.join(__dirname, '../../../../uploads');
async function fotoRoutes(app) {
    // Setup uploads dir
    if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
    app.post('/registros/:registroId/fotos', { preHandler: [keycloak_auth_middleware_1.keycloakAuthMiddleware] }, async (request, reply) => {
        const userContext = request.userContext;
        const { registroId } = request.params;
        // Verify if registro belongs to user's company
        const registro = await prisma_1.prisma.registro.findFirst({
            where: { id: registroId, empresaId: userContext.empresaId }
        });
        if (!registro) {
            return reply.status(404).send({ error: 'Registro não encontrado' });
        }
        const data = await request.file();
        if (!data) {
            return reply.status(400).send({ error: 'Nenhum arquivo enviado' });
        }
        const uniqueName = `${Date.now()}-${data.filename}`;
        const localFilePath = path_1.default.join(uploadDir, uniqueName);
        await pump(data.file, fs_1.default.createWriteStream(localFilePath));
        const remoteUrl = `/uploads/${uniqueName}`;
        return reply.send({
            success: true,
            remoteUrl,
            fileName: uniqueName
        });
    });
}
//# sourceMappingURL=routes.js.map