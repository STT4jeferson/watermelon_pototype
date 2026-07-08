import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infra/prisma';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { pipeline } from 'stream';
import { keycloakAuthMiddleware } from '../../infra/auth/keycloak/keycloak-auth.middleware';

const pump = util.promisify(pipeline);
const uploadDir = path.join(__dirname, '../../../../uploads');

export async function fotoRoutes(app: FastifyInstance) {
  // Setup uploads dir
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  app.post(
    '/registros/:registroId/fotos', 
    { preHandler: [keycloakAuthMiddleware] }, 
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userContext = request.userContext!;
      const { registroId } = request.params as { registroId: string };

      // Verify if registro belongs to user's company
      const registro = await prisma.registro.findFirst({
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
      const localFilePath = path.join(uploadDir, uniqueName);

      await pump(data.file, fs.createWriteStream(localFilePath));

      const remoteUrl = `/uploads/${uniqueName}`;

      return reply.send({
        success: true,
        remoteUrl,
        fileName: uniqueName
      });
    }
  );
}
