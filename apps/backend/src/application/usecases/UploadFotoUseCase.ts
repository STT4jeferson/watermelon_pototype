import fs from 'fs';
import path from 'path';
import util from 'util';
import { pipeline } from 'stream';
import { IRegistroRepository } from '../../domain/repositories/IRegistroRepository';

const pump = util.promisify(pipeline);
const uploadDir = path.join(__dirname, '../../../../../uploads');

export interface UploadFotoInput {
  registroId: string;
  empresaId: number;
  fileStream: NodeJS.ReadableStream;
  filename: string;
}

export class UploadFotoUseCase {
  constructor(private registroRepository: IRegistroRepository) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  async execute(input: UploadFotoInput): Promise<{ remoteUrl: string; fileName: string }> {
    const exists = await this.registroRepository.existsInCompany(input.registroId, input.empresaId);
    
    if (!exists) {
      throw new Error('NOT_FOUND: Registro não encontrado ou não pertence a esta empresa.');
    }

    const uniqueName = `${Date.now()}-${input.filename}`;
    const localFilePath = path.join(uploadDir, uniqueName);

    await pump(input.fileStream, fs.createWriteStream(localFilePath));

    return {
      remoteUrl: `/uploads/${uniqueName}`,
      fileName: uniqueName
    };
  }
}
