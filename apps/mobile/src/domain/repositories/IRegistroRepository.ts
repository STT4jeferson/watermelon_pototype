import { RegistroDomain } from '../entities/Registro';

// Usaremos `any` para o tipo bruto do observável para não acoplar a interface do domínio estritamente ao tipo da lib RxJS
export interface IRegistroRepository {
  createWithPhotos(registro: Omit<RegistroDomain, 'id'>, fotosPaths: string[]): Promise<void>;
  observeAll(usuarioId: number, filterType: string, sortOrder: 'asc' | 'desc'): any; 
  observePendingPhotosCount(usuarioId: number): any;
  clearLocalData(usuarioId: number): Promise<void>;
  getRegistroDetails(registroId: string): Promise<{ registro: any, fotosObservable: any }>;
}
