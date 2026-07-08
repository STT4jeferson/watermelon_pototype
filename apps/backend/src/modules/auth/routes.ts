import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infra/prisma';
import { keycloakAuthMiddleware } from '../../infra/auth/keycloak/keycloak-auth.middleware';

export async function authRoutes(app: FastifyInstance) {
  // A rota de login via POST /auth/login e validação de bcrypt foi REMOVIDA 
  // O aplicativo utilizará OAuth2 no client mobile para autenticar no Keycloak
  
  // Rota de Perfil Protegida para retornar as informações do usuário atual
  app.get(
    '/me',
    { preHandler: [keycloakAuthMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userContext = request.userContext!;

      // Pode retornar o dado vindo do DB se preferir carregar dados mais completos
      const usuario = await prisma.usuario.findUnique({
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
    }
  );
}