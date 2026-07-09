import { FastifyRequest, FastifyReply } from 'fastify';
import { PullSyncUseCase } from '../../application/usecases/PullSyncUseCase';
import { PushSyncUseCase } from '../../application/usecases/PushSyncUseCase';

export class SyncController {
  constructor(
    private pullSyncUseCase: PullSyncUseCase,
    private pushSyncUseCase: PushSyncUseCase
  ) {}

  async pull(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { lastPulledAt?: string };
    const lastPulledAt = query.lastPulledAt && query.lastPulledAt !== 'null' ? parseInt(query.lastPulledAt, 10) : 0;
    
    const userContext = request.userContext!;

    const result = await this.pullSyncUseCase.execute(userContext.empresaId, lastPulledAt);
    return reply.send(result);
  }

  async push(request: FastifyRequest, reply: FastifyReply) {
    const userContext = request.userContext!;
    const body = request.body as any;
    const changes = body.changes || {};

    await this.pushSyncUseCase.execute(userContext.empresaId, userContext.usuarioId, changes);
    return reply.status(200).send({ success: true });
  }
}
