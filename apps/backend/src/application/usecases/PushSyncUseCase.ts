import { ISyncRepository } from '../../domain/repositories/ISyncRepository';
import { SyncPushPayload } from '../../domain/entities/Sync';

export class PushSyncUseCase {
  constructor(private syncRepository: ISyncRepository) {}

  async execute(empresaId: number, usuarioId: number, changes: SyncPushPayload): Promise<void> {
    if (!changes || Object.keys(changes).length === 0) {
      return; // Nada para sincronizar
    }

    await this.syncRepository.pushChanges(empresaId, usuarioId, changes);
  }
}
