import { IRegistroRepository } from '../../domain/repositories/IRegistroRepository';
import { storage } from '../../infra/storage';
import { Logger } from '../../infra/logger';

export interface CreateRegistroInput {
  tipo: 'Compra' | 'Venda';
  descricao: string;
  fotos: string[];
}

export class CreateRegistroUseCase {
  constructor(private registroRepository: IRegistroRepository) {}

  async execute(input: CreateRegistroInput): Promise<void> {
    Logger.info('UseCase', 'Executando CreateRegistroUseCase', { tipo: input.tipo, qtdFotos: input.fotos?.length });

    if (!input.tipo) {
      Logger.warn('UseCase', 'Validação falhou: Tipo obrigatório');
      throw new Error('O tipo do registro é obrigatório.');
    }
    if (input.descricao.trim().length < 10) {
      Logger.warn('UseCase', 'Validação falhou: Descrição muito curta');
      throw new Error('A descrição deve conter pelo menos 10 caracteres.');
    }

    try {
      const session = await storage.getSession();
      const empresaId = session?.user?.empresaId || 1;
      const usuarioId = session?.user?.id || 1;
      const now = new Date();

      await this.registroRepository.createWithPhotos({
        tipo: input.tipo,
        descricao: input.descricao.trim(),
        dataHora: now,
        status: 'pending',
        empresaId,
        usuarioId,
        createdAt: now,
        updatedAt: now,
      }, input.fotos);

      Logger.info('UseCase', 'Registro criado com sucesso');
    } catch (error) {
      Logger.error('UseCase', 'Erro ao criar registro', error);
      throw error;
    }
  }
}
