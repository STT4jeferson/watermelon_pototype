import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../../database';
import { api } from '../../infra/http';
import { storage } from '../../infra/storage';
import * as FileSystem from 'expo-file-system';
import { FotoRegistro, Registro } from '../../database/models';
import { Q } from '@nozbe/watermelondb';

export type SyncProgress = {
  phase: 'idle' | 'records' | 'photos' | 'done' | 'error';
  totalPhotos?: number;
  syncedPhotos?: number;
  errorCount?: number;
};

export async function syncData(onProgress?: (progress: SyncProgress) => void) {
  try {
    if (onProgress) onProgress({ phase: 'records' });

    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
        const response = await api.get(`/sync/pull?lastPulledAt=${lastPulledAt || 0}`);
        return {
          changes: response.changes,
          timestamp: response.timestamp,
        };
      },
      pushChanges: async ({ changes, lastPulledAt }) => {
        await api.post('/sync/push', { changes, lastPulledAt });
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
      onProgress({ 
        phase: errors > 0 ? 'error' : 'done', 
        errorCount: errors 
      });
    }
  } catch (error) {
    console.error('Global sync error', error);
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

      await database.write(async () => {
        await foto.update(f => {
          f.remoteUrl = uploadResponse.remoteUrl;
          f.status = 'uploaded';
        });
      });
      syncedPhotos++;
      if (onProgress) onProgress({ phase: 'photos', totalPhotos, syncedPhotos });
    } catch (error) {
      console.error('Erro ao sincronizar foto', foto.id, error);
      errors++;
      await database.write(async () => {
        await foto.update(f => { f.status = 'failed'; });
      });
    }
  }
  return errors;
}