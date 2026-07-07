import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../../infra/prisma';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { login, senha } = request.body as any;

    if (!login || !senha) {
      return reply.status(400).send({ error: 'Login e senha são obrigatórios' });
    }

    const user = await prisma.usuario.findUnique({
      where: { login },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Credenciais inválidas' });
    }

    const isMatch = await bcrypt.compare(senha, user.senha);
    if (!isMatch) {
      return reply.status(401).send({ error: 'Credenciais inválidas' });
    }

    const token = app.jwt.sign({ id: user.id, empresaId: user.empresaId });

    return {
      token,
      user: {
        id: user.id,
        nome: user.nome,
        login: user.login,
        empresaId: user.empresaId,
      },
    };
  });
}
