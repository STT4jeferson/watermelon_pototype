import { FastifyInstance } from 'fastify';
import { keycloakAuthMiddleware } from '../../infra/auth/keycloak/keycloak-auth.middleware';
import { PrismaRegistroRepository } from '../../infrastructure/repositories/PrismaRegistroRepository';
import { UploadFotoUseCase } from '../../application/usecases/UploadFotoUseCase';
import { FotoController } from '../../presentation/controllers/FotoController';

// Setup de Injeção de Dependências
const registroRepository = new PrismaRegistroRepository();
const uploadFotoUseCase = new UploadFotoUseCase(registroRepository);
const fotoController = new FotoController(uploadFotoUseCase);

export async function fotoRoutes(app: FastifyInstance) {
  app.post(
    '/registros/:registroId/fotos', 
    { preHandler: [keycloakAuthMiddleware] }, 
    fotoController.upload.bind(fotoController)
  );
}
