import { FastifyRequest, FastifyReply } from 'fastify';
import { UploadFotoUseCase } from '../../application/usecases/UploadFotoUseCase';

export class FotoController {
  constructor(private uploadFotoUseCase: UploadFotoUseCase) {}

  async upload(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userContext = request.userContext!;
      const { registroId } = request.params as { registroId: string };

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'Nenhum arquivo enviado' });
      }

      const result = await this.uploadFotoUseCase.execute({
        registroId,
        empresaId: userContext.empresaId,
        fileStream: data.file,
        filename: data.filename
      });

      return reply.status(200).send({
        success: true,
        remoteUrl: result.remoteUrl,
        fileName: result.fileName
      });
    } catch (error: any) {
      if (error.message.startsWith('NOT_FOUND')) {
        return reply.status(404).send({ error: 'Registro não encontrado' });
      }
      return reply.status(500).send({ error: 'Erro interno ao processar upload' });
    }
  }
}
