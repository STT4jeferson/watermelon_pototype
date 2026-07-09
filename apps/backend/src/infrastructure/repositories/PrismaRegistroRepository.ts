import { IRegistroRepository } from '../../domain/repositories/IRegistroRepository';
import { prisma } from '../../infra/prisma';

export class PrismaRegistroRepository implements IRegistroRepository {
  async existsInCompany(registroId: string, empresaId: number): Promise<boolean> {
    const registro = await prisma.registro.findFirst({
      where: { id: registroId, empresaId },
      select: { id: true }
    });
    return !!registro;
  }
}
