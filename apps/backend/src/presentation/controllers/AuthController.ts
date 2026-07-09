import { FastifyRequest, FastifyReply } from 'fastify';
import { GetUsuarioProfileUseCase } from '../../application/usecases/GetUsuarioProfileUseCase';

export class AuthController {
  constructor(private getUsuarioProfileUseCase: GetUsuarioProfileUseCase) {}

  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userContext = request.userContext!;
      const profile = await this.getUsuarioProfileUseCase.execute(userContext.usuarioId);
      return reply.send(profile);
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND')) {
        return reply.status(404).send({ error: 'Usuário não encontrado' });
      }
      return reply.status(500).send({ error: 'Erro interno' });
    }
  }
}
