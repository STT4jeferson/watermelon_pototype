import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import path from 'path';

import { authRoutes } from './modules/auth/routes';
import { syncRoutes } from './modules/sync/routes';
import { fotoRoutes } from './modules/fotos/routes';

dotenv.config();

const app = Fastify({ logger: true });

app.register(cors, { origin: '*' });

app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'supersecret123',
});

app.register(fastifyMultipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

app.register(fastifyStatic, {
  root: path.join(__dirname, '../../uploads'),
  prefix: '/uploads/',
});

app.get('/health', async () => {
  return { status: 'ok' };
});

app.register(authRoutes);
app.register(syncRoutes);
app.register(fotoRoutes);

const start = async () => {
  try {
    await app.listen({ port: 3333, host: '0.0.0.0' });
    console.log(`Backend rodando na porta 3333`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
