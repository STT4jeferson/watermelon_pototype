export type AuthenticatedUserContext = {
    keycloakId: string;
    usuarioId: number;
    empresaId: number;
    login: string;
    nome: string;
};
declare module 'fastify' {
    interface FastifyRequest {
        userContext?: AuthenticatedUserContext;
    }
}
//# sourceMappingURL=authenticated-user.context.d.ts.map