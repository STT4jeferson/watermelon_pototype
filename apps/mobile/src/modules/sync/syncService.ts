import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../../database';
import { api } from '../../infra/http';
import { storage } from '../../infra/storage';
import * as FileSystem from 'expo-file-system';
import { FotoRegistro, Registro } from '../../database/models';
import { Q } from '@nozbe/watermelondb';
import { Logger } from '../../infra/logger';

export type SyncProgress = {
  phase: 'idle' | 'records' | 'photos' | 'done' | 'error';
  totalPhotos?: number;
  syncedPhotos?: number;
  errorCount?: number;
};

export async function syncData(onProgress?: (progress: SyncProgress) => void) {
  try {
    Logger.info('Sync', 'Iniciando Sincronização Global');
    if (onProgress) onProgress({ phase: 'records' });

    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
        Logger.debug('Sync', `Realizando pull request (lastPulledAt: ${lastPulledAt})`);
        const response = await api.get(`/sync/pull?lastPulledAt=${lastPulledAt || 0}`);
        Logger.info('Sync', 'Pull finalizado com sucesso', { timestamp: response.timestamp });
        return {
          changes: response.changes,
          timestamp: response.timestamp,
        };
      },
      pushChanges: async ({ changes, lastPulledAt }) => {
        Logger.debug('Sync', 'Realizando push request', { changes });
        await api.post('/sync/push', { changes, lastPulledAt });
        Logger.info('Sync', 'Push finalizado com sucesso');
      },
    });

    const registrosCollection = database.get<Registro>('registros');
    const registrosPendentes = await registrosCollection.query(Q.where('sync_status', 'pending')).fetch();
    
    if (registrosPendentes.length > 0) {
      await database.write(async () => {
        for (const r of registrosPendentes) {
          await r.update(rec => { rec.status = 'synced'; });
        }
      });
    }

    if (onProgress) onProgress({ phase: 'photos' });
    Logger.info('Sync', 'Iniciando sincronização de fotos');
    const errors = await syncFotos(onProgress);

    const { storage } = require('../../infra/storage');
    const session = await storage.getSession();
    if (session) {
      await storage.saveSession({
        ...session,
        lastSync: new Date().toISOString()
      });
    }

    if (onProgress) {
      Logger.info('Sync', 'Sincronização Global Finalizada', { errors });
      onProgress({ 
        phase: errors > 0 ? 'error' : 'done', 
        errorCount: errors 
      });
    }
  } catch (error) {
    Logger.error('Sync', 'Erro crítico durante a sincronização global', error);
    if (onProgress) onProgress({ phase: 'error', errorCount: 1 });
    throw error;
  }
}

async function syncFotos(onProgress?: (progress: SyncProgress) => void): Promise<number> {
  const fotosCollection = database.get<FotoRegistro>('foto_registros');
  const fotosPendentes = await fotosCollection.query().fetch();
  const fotosToSync = fotosPendentes.filter(f => f.status === 'local' || f.status === 'pending' || f.status === 'failed');
  
  const totalPhotos = fotosToSync.length;
  let syncedPhotos = 0;
  let errors = 0;

  if (totalPhotos > 0 && onProgress) {
    onProgress({ phase: 'photos', totalPhotos, syncedPhotos });
  }

  for (const foto of fotosToSync) {
    try {
      await database.write(async () => {
        await foto.update(f => { f.status = 'uploading'; });
      });

      const formData = new FormData();
      const fileInfo = await FileSystem.getInfoAsync(foto.localPath);
      
      if (!fileInfo.exists) throw new Error('Arquivo não encontrado no dispositivo');

      formData.append('file', {
        uri: foto.localPath,
        name: foto.fileName || 'photo.jpg',
        type: foto.mimeType || 'image/jpeg',
      } as any);

      const uploadResponse = await api.postFormData(`/registros/${foto.registroId}/fotos`, formData);
      Logger.debug('Sync', `Foto ${foto.id} enviada com sucesso`);

      await database.write(async () => {
        await foto.update(f => {
          f.remoteUrl = uploadResponse.remoteUrl;
          f.status = 'uploaded';
        });
      });
      syncedPhotos++;
      if (onProgress) onProgress({ phase: 'photos', totalPhotos, syncedPhotos });
    } catch (error) {
      Logger.error('Sync', `Erro ao sincronizar foto ${foto.id}`, error);
      errors++;
      await database.write(async () => {
        await foto.update(f => { f.status = 'failed'; });
      });
    }
  }
  return errors;
}