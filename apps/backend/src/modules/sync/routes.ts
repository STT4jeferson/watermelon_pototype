import { FastifyInstance } from 'fastify';
import { keycloakAuthMiddleware } from '../../infra/auth/keycloak/keycloak-auth.middleware';
import { PrismaSyncRepository } from '../../infrastructure/repositories/PrismaSyncRepository';
import { PullSyncUseCase } from '../../application/usecases/PullSyncUseCase';
import { PushSyncUseCase } from '../../application/usecases/PushSyncUseCase';
import { SyncController } from '../../presentation/controllers/SyncController';

// Setup de Injeção de Dependências (Idealmente feito em um Container IoC como TSyringe)
const syncRepository = new PrismaSyncRepository();
const pullSyncUseCase = new PullSyncUseCase(syncRepository);
const pushSyncUseCase = new PushSyncUseCase(syncRepository);
const syncController = new SyncController(pullSyncUseCase, pushSyncUseCase);

export async function syncRoutes(app: FastifyInstance) {
  // Pull Changes Endpoint
  app.get(
    '/sync/pull',
    { preHandler: [keycloakAuthMiddleware] },
    syncController.pull.bind(syncController)
  );

  // Push Changes Endpoint
  app.post(
    '/sync/push',
    { preHandler: [keycloakAuthMiddleware] },
    syncController.push.bind(syncController)
  );
}
