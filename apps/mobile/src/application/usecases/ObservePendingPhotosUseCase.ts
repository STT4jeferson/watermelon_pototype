import { IRegistroRepository } from '../../domain/repositories/IRegistroRepository';

export class ObservePendingPhotosUseCase {
  constructor(private registroRepository: IRegistroRepository) {}

  execute(usuarioId: number) {
    return this.registroRepository.observePendingPhotosCount(usuarioId);
  }
}
