import { SyncPullPayload, SyncPushPayload } from '../entities/Sync';

export interface ISyncRepository {
  pullChanges(empresaId: number, since: Date): Promise<SyncPullPayload>;
  pushChanges(empresaId: number, usuarioId: number, changes: SyncPushPayload): Promise<void>;
}
