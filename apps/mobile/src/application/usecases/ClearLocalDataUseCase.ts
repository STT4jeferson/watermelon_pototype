import { IRegistroRepository } from '../../domain/repositories/IRegistroRepository';

export class ClearLocalDataUseCase {
  constructor(private registroRepository: IRegistroRepository) {}

  async execute(usuarioId: number): Promise<void> {
    await this.registroRepository.clearLocalData(usuarioId);
  }
}
