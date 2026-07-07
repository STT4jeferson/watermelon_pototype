import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infra/prisma';

export async function syncRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  app.get('/sync', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { lastPulledAt?: string };
    const lastPulledAt = query.lastPulledAt && query.lastPulledAt !== 'null' ? parseInt(query.lastPulledAt, 10) : 0;
    
    // We expect the JWT payload to contain user info
    const user = request.user as { id: number; empresaId: number };

    // Watermelon uses timestamps (milliseconds) typically, 
    // Prisma uses Date objects. Let's convert:
    const since = new Date(lastPulledAt);

    // Fetch changes for `empresas`, `usuarios`, `registros`, `foto_registros`
    // but only for this user's company
    const empresaId = user.empresaId;

    const pullChanges = async (modelDelegate: any, whereClause: any) => {
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
        deleted: deletedRecords.map((r: any) => String(r.id)),
      };
    };

    const changes = {
      empresas: await pullChanges(prisma.empresa, { id: empresaId }),
      usuarios: await pullChanges(prisma.usuario, { empresaId }),
      registros: await pullChanges(prisma.registro, { empresaId }),
      foto_registros: await pullChanges(prisma.fotoRegistro, { empresaId }),
    };

    return {
      changes,
      timestamp: Date.now(),
    };
  });

  app.post('/sync', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: number; empresaId: number };
    const body = request.body as any;
    const changes = body.changes || {};

    const safeMapData = (data: any[], mapper: (item: any) => any) => data ? data.map(mapper) : [];

    await prisma.$transaction(async (tx) => {
      // REGISTROS
      if (changes.registros) {
        const { created, updated, deleted } = changes.registros;
        
        for (const record of created || []) {
          await tx.registro.create({
            data: {
              id: record.id,
              empresaId: user.empresaId,
              usuarioId: user.id, // Or record.usuario_id if trusted
              tipo: record.tipo,
              dataHora: new Date(record.data_hora),
              descricao: record.descricao,
            }
          });
        }
        
        for (const record of updated || []) {
          await tx.registro.updateMany({
            where: { id: record.id, empresaId: user.empresaId },
            data: {
              tipo: record.tipo,
              dataHora: new Date(record.data_hora),
              descricao: record.descricao,
            }
          });
        }
        
        for (const id of deleted || []) {
          await tx.registro.updateMany({
            where: { id, empresaId: user.empresaId },
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
              registroId: record.registro_id,
              empresaId: user.empresaId,
              usuarioId: user.id,
              localPath: record.local_path,
              remoteUrl: record.remote_url,
              mimeType: record.mime_type,
              fileName: record.file_name,
            }
          });
        }
        
        for (const record of updated || []) {
          await tx.fotoRegistro.updateMany({
            where: { id: record.id, empresaId: user.empresaId },
            data: {
              localPath: record.local_path,
              remoteUrl: record.remote_url,
              mimeType: record.mime_type,
              fileName: record.file_name,
            }
          });
        }
        
        for (const id of deleted || []) {
          await tx.fotoRegistro.updateMany({
            where: { id, empresaId: user.empresaId },
            data: { deletedAt: new Date() }
          });
        }
      }
    });

    return reply.status(200).send({ success: true });
  });
}
