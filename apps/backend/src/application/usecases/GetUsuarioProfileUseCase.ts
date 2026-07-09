import { IUsuarioRepository, UsuarioPerfilDomain } from '../../domain/repositories/IUsuarioRepository';

export class GetUsuarioProfileUseCase {
  constructor(private usuarioRepository: IUsuarioRepository) {}

  async execute(usuarioId: number): Promise<UsuarioPerfilDomain> {
    const profile = await this.usuarioRepository.getProfile(usuarioId);
    
    if (!profile) {
      throw new Error('NOT_FOUND: Usuário não encontrado');
    }

    return profile;
  }
}
