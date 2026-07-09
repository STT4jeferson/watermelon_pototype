export interface SyncChanges<T> {
  created: T[];
  updated: T[];
  deleted: string[];
}

export interface SyncPullPayload {
  empresas: SyncChanges<any>;
  usuarios: SyncChanges<any>;
  registros: SyncChanges<any>;
  foto_registros: SyncChanges<any>;
}

export interface SyncPushPayload {
  registros?: SyncChanges<any>;
  foto_registros?: SyncChanges<any>;
}
