import { FastifyRequest, FastifyReply } from 'fastify';
import { validateToken } from './keycloak-jwt.validator';
import { PrismaClient } from '@prisma/client';
import './authenticated-user.context'; // import para tipagem

const prisma = new PrismaClient();

export async function keycloakAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token não fornecido ou inválido' });
    }

    const token = authHeader.split(' ')[1];

    // 1. Valida o JWT contra o Keycloak
    const decodedToken = await validateToken(token!);
    const keycloakId = decodedToken.sub;

    if (!keycloakId || typeof keycloakId !== 'string') {
      return reply.status(401).send({ error: 'Token sem identificação (sub) válida' });
    }

    // 2. Busca o usuário no MySQL baseado no keycloak_id
    let usuarioDb = await prisma.usuario.findUnique({
      where: { keycloakId },
      include: { empresa: true },
    });

    // JIT Provisioning (Just-In-Time Provisioning)
    // Se o usuário logou no Keycloak mas não existe no MySQL, criamos ele automaticamente!
    if (!usuarioDb) {
      let empresaIdFinal = 1; // Fallback

      // Verifica se o Keycloak enviou a claim "groups" (Array de strings)
      const userGroups = decodedToken.groups as string[];
      
      if (userGroups && userGroups.length > 0) {
        // Pegamos o primeiro grupo como o nome da Empresa
        // (Limpamos barras iniciais caso a config do Keycloak mande full path, ex: "/Empresa X")
        const groupName = userGroups[0].replace(/^\//, ''); 
        const groupCodigo = groupName.toUpperCase().replace(/\s+/g, '_'); // Ex: "Empresa X" -> "EMPRESA_X"

        // JIT Dinâmico para a EMPRESA: Se a empresa não existir no MySQL, cria ela agora!
        const empresa = await prisma.empresa.upsert({
          where: { codigo: groupCodigo },
          update: {},
          create: {
            codigo: groupCodigo,
            nome: groupName
          }
        });
        
        empresaIdFinal = empresa.id;
        request.log.info(`JIT Empresa: Reconhecida a empresa [${empresa.nome}] a partir do grupo do Keycloak.`);
      } else {
        // Fallback antigo por atributo manual, caso não tenha grupos
        const empresaIdToken = decodedToken.empresa_id ? parseInt(String(decodedToken.empresa_id), 10) : null;
        if (empresaIdToken && !isNaN(empresaIdToken)) {
           empresaIdFinal = empresaIdToken;
        }
      }

      usuarioDb = await prisma.usuario.create({
        data: {
          keycloakId: keycloakId,
          nome: (decodedToken.name as string) || (decodedToken.preferred_username as string) || 'Novo Usuário',
          login: (decodedToken.email as string) || (decodedToken.preferred_username as string) || keycloakId,
          empresaId: empresaIdFinal, 
        },
        include: { empresa: true }
      });
      request.log.info(`Usuário sincronizado automaticamente do Keycloak: ${usuarioDb.login} (Empresa: ${usuarioDb.empresa.nome})`);
    }

    if (usuarioDb.deletedAt) {
      return reply.status(403).send({ error: 'Usuário desativado' });
    }

    // 3. Monta o contexto para os endpoints protegidos
    request.userContext = {
      keycloakId: usuarioDb.keycloakId,
      usuarioId: usuarioDb.id,
      empresaId: usuarioDb.empresaId,
      login: usuarioDb.login,
      nome: usuarioDb.nome,
    };

  } catch (err: any) {
    request.log.error(err);
    return reply.status(401).send({ error: 'Falha na validação do token', details: err.message });
  }
}
