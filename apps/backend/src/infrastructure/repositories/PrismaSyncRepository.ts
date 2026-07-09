import { ISyncRepository } from '../../domain/repositories/ISyncRepository';
import { SyncPullPayload, SyncPushPayload } from '../../domain/entities/Sync';
import { prisma } from '../../infra/prisma';

export class PrismaSyncRepository implements ISyncRepository {
  
  private async getModelChanges(modelDelegate: any, whereClause: any, since: Date) {
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
  }

  async pullChanges(empresaId: number, since: Date): Promise<SyncPullPayload> {
    return {
      empresas: await this.getModelChanges(prisma.empresa, { id: empresaId }, since),
      usuarios: await this.getModelChanges(prisma.usuario, { empresaId }, since),
      registros: await this.getModelChanges(prisma.registro, { empresaId }, since),
      foto_registros: await this.getModelChanges(prisma.fotoRegistro, { empresaId }, since),
    };
  }

  async pushChanges(empresaId: number, usuarioId: number, changes: SyncPushPayload): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // REGISTROS
      if (changes.registros) {
        const { created, updated, deleted } = changes.registros;
        
        for (const record of created || []) {
          await tx.registro.create({
            data: {
              id: record.id,
              empresaId,
              usuarioId,
              tipo: record.tipo,
              dataHora: new Date(record.data_hora || record.dataHora),
              descricao: record.descricao,
            }
          });
        }
        
        for (const record of updated || []) {
          await tx.registro.updateMany({
            where: { id: record.id, empresaId },
            data: {
              tipo: record.tipo,
              dataHora: new Date(record.data_hora || record.dataHora),
              descricao: record.descricao,
            }
          });
        }
        
        for (const id of deleted || []) {
          await tx.registro.updateMany({
            where: { id, empresaId },
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
              empresaId,
              usuarioId,
              localPath: record.local_path || record.localPath,
              remoteUrl: record.remote_url || record.remoteUrl,
              mimeType: record.mime_type || record.mimeType,
              fileName: record.file_name || record.fileName,
            }
          });
        }
        
        for (const record of updated || []) {
          await tx.fotoRegistro.updateMany({
            where: { id: record.id, empresaId },
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
            where: { id, empresaId },
            data: { deletedAt: new Date() }
          });
        }
      }
    });
  }
}
