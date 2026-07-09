import { IRegistroRepository } from '../../domain/repositories/IRegistroRepository';

export class ObserveRegistrosUseCase {
  constructor(private registroRepository: IRegistroRepository) {}

  execute(usuarioId: number, filterType: string, sortOrder: 'asc' | 'desc') {
    return this.registroRepository.observeAll(usuarioId, filterType, sortOrder);
  }
}
