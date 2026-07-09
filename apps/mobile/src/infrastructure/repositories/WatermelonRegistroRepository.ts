import { database } from '../../database';
import { Registro, FotoRegistro } from '../../database/models';
import { IRegistroRepository } from '../../domain/repositories/IRegistroRepository';
import { RegistroDomain } from '../../domain/entities/Registro';
import { Q } from '@nozbe/watermelondb';

export class WatermelonRegistroRepository implements IRegistroRepository {
  observeAll(usuarioId: number, filterType: string, sortOrder: 'asc' | 'desc') {
    const conditions: any[] = [Q.where('usuario_id', usuarioId)];
    if (filterType !== 'all') {
      conditions.push(Q.where('tipo', filterType));
    }
    conditions.push(Q.sortBy('data_hora', sortOrder));

    return database.collections
      .get<Registro>('registros')
      .query(...conditions)
      .observeWithColumns(['sync_status', 'tipo', 'descricao', 'data_hora']);
  }

  observePendingPhotosCount(usuarioId: number) {
    return database.collections.get<FotoRegistro>('foto_registros')
      .query(
        Q.where('usuario_id', usuarioId),
        Q.or(
          Q.where('sync_status', 'local'),
          Q.where('sync_status', 'pending'),
          Q.where('sync_status', 'failed')
        )
      )
      .observeCount();
  }

  async getRegistroDetails(registroId: string): Promise<{ registro: any, fotosObservable: any }> {
    const reg = await database.collections.get<Registro>('registros').find(registroId);
    return {
      registro: reg,
      fotosObservable: reg.fotos.observe()
    };
  }

  async clearLocalData(usuarioId: number): Promise<void> {
    const regs = await database.get<Registro>('registros').query(Q.where('usuario_id', usuarioId)).fetch();
    const fotos = await database.get<FotoRegistro>('foto_registros').query(Q.where('usuario_id', usuarioId)).fetch();
    
    await database.write(async () => {
      for (const f of fotos) {
        await f.destroyPermanently();
      }
      for (const r of regs) {
        await r.destroyPermanently();
      }
    });
  }

  async createWithPhotos(registroData: Omit<RegistroDomain, 'id'>, fotosPaths: string[]): Promise<void> {
    await database.write(async () => {
      const novoRegistro = await database.collections.get<Registro>('registros').create(registro => {
        registro.tipo = registroData.tipo;
        registro.descricao = registroData.descricao;
        registro.dataHora = registroData.dataHora;
        registro.status = registroData.status;
        registro.empresaId = registroData.empresaId;
        registro.usuarioId = registroData.usuarioId;
        registro.createdAt = registroData.createdAt || new Date();
        registro.updatedAt = registroData.updatedAt || new Date();
      });

      for (const uri of fotosPaths) {
        await database.collections.get<FotoRegistro>('foto_registros').create(foto => {
          foto.registro.set(novoRegistro);
          foto.localPath = uri;
          foto.fileName = uri.split('/').pop() || 'photo.jpg';
          foto.mimeType = 'image/jpeg';
          foto.status = 'local';
          foto.empresaId = registroData.empresaId;
          foto.usuarioId = registroData.usuarioId;
          foto.createdAt = registroData.createdAt || new Date();
          foto.updatedAt = registroData.updatedAt || new Date();
        });
      }
    });
  }
}
