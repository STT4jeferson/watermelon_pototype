import { IUsuarioRepository, UsuarioPerfilDomain } from '../../domain/repositories/IUsuarioRepository';
import { prisma } from '../../infra/prisma';

export class PrismaUsuarioRepository implements IUsuarioRepository {
  async getProfile(usuarioId: number): Promise<UsuarioPerfilDomain | null> {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { empresa: true },
    });

    if (!usuario) return null;

    return {
      id: usuario.id,
      keycloakId: usuario.keycloakId,
      nome: usuario.nome,
      login: usuario.login,
      empresa: {
        id: usuario.empresa.id,
        codigo: usuario.empresa.codigo,
        nome: usuario.empresa.nome,
      },
    };
  }
}
