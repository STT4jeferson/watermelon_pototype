export type AuthenticatedUserContext = {
  keycloakId: string;
  usuarioId: number;
  empresaId: number;
  login: string;
  nome: string;
};

// Extender o FastifyRequest para incluir o contexto do usuário
declare module 'fastify' {
  interface FastifyRequest {
    userContext?: AuthenticatedUserContext;
  }
}
