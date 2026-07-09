import { FastifyInstance } from 'fastify';
import { keycloakAuthMiddleware } from '../../infra/auth/keycloak/keycloak-auth.middleware';
import { PrismaUsuarioRepository } from '../../infrastructure/repositories/PrismaUsuarioRepository';
import { GetUsuarioProfileUseCase } from '../../application/usecases/GetUsuarioProfileUseCase';
import { AuthController } from '../../presentation/controllers/AuthController';

const usuarioRepository = new PrismaUsuarioRepository();
const getUsuarioProfileUseCase = new GetUsuarioProfileUseCase(usuarioRepository);
const authController = new AuthController(getUsuarioProfileUseCase);

export async function authRoutes(app: FastifyInstance) {
  app.get(
    '/me',
    { preHandler: [keycloakAuthMiddleware] },
    authController.me.bind(authController)
  );
}
