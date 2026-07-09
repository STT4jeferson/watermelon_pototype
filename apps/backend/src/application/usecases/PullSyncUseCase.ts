import { ISyncRepository } from '../../domain/repositories/ISyncRepository';
import { SyncPullPayload } from '../../domain/entities/Sync';

export class PullSyncUseCase {
  constructor(private syncRepository: ISyncRepository) {}

  async execute(empresaId: number, lastPulledAt: number): Promise<{ changes: SyncPullPayload, timestamp: number }> {
    const since = new Date(lastPulledAt);
    const changes = await this.syncRepository.pullChanges(empresaId, since);
    
    return {
      changes,
      timestamp: Date.now(),
    };
  }
}
