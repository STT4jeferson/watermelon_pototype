export interface RegistroDomain {
  id?: string;
  tipo: 'Compra' | 'Venda';
  descricao: string;
  dataHora: Date;
  status: string;
  empresaId: number;
  usuarioId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FotoRegistroDomain {
  id?: string;
  registroId?: string;
  localPath: string;
  fileName: string;
  mimeType: string;
  status: string;
  empresaId: number;
  usuarioId: number;
}
