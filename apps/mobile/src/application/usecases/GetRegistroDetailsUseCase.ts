import { IRegistroRepository } from '../../domain/repositories/IRegistroRepository';

export class GetRegistroDetailsUseCase {
  constructor(private registroRepository: IRegistroRepository) {}

  async execute(registroId: string) {
    return this.registroRepository.getRegistroDetails(registroId);
  }
}
