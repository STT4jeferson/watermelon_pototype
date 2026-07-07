import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from '../../database';
import { api } from '../../infra/http';
import { storage } from '../../infra/storage';
import * as FileSystem from 'expo-file-system';
import { FotoRegistro } from '../../database/models';

export async function syncData() {
  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      const response = await api.get(`/sync?lastPulledAt=${lastPulledAt || 0}`);
      
      return {
        changes: response.changes,
        timestamp: response.timestamp,
      };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      await api.post('/sync', { changes, lastPulledAt });
    },
    migrationsEnabledAtVersion: 1,
  });

  // Sync photos after data sync
  await syncFotos();
}

async function syncFotos() {
  const fotosCollection = database.get<FotoRegistro>('foto_registros');
  const fotosPendentes = await fotosCollection.query().fetch();
  
  for (const foto of fotosPendentes) {
    if (foto.status === 'pending' && foto.localPath) {
      try {
        const formData = new FormData();
        const fileInfo = await FileSystem.getInfoAsync(foto.localPath);
        
        if (!fileInfo.exists) continue;

        formData.append('file', {
          uri: foto.localPath,
          name: foto.fileName || 'photo.jpg',
          type: foto.mimeType || 'image/jpeg',
        } as any);

        const uploadResponse = await api.postFormData(`/registros/${foto.registroId}/fotos`, formData);

        await database.write(async () => {
          await foto.update(f => {
            f.remoteUrl = uploadResponse.remoteUrl;
            f.status = 'synced';
          });
        });
      } catch (error) {
        console.error('Erro ao sincronizar foto', foto.id, error);
      }
    }
  }
}