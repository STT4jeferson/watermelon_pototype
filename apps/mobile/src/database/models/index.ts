import { Model, Query } from '@nozbe/watermelondb'
import { field, text, date, children, relation } from '@nozbe/watermelondb/decorators'

export class Empresa extends Model {
  static table = 'empresas'

  @text('nome') nome!: string
  @date('created_at') createdAt!: Date
  @date('updated_at') updatedAt!: Date
}

export class Usuario extends Model {
  static table = 'usuarios'

  @text('nome') nome!: string
  @text('login') login!: string
  @field('empresa_id') empresaId!: number
  @date('created_at') createdAt!: Date
  @date('updated_at') updatedAt!: Date
}

export class FotoRegistro extends Model {
  static table = 'foto_registros'
  static associations = {
    registros: { type: 'belongs_to' as const, key: 'registro_id' },
  }

  @text('registro_id') registroId!: string
  @field('empresa_id') empresaId!: number
  @field('usuario_id') usuarioId!: number
  @text('local_path') localPath!: string
  @text('remote_url') remoteUrl!: string
  @text('mime_type') mimeType!: string
  @text('file_name') fileName!: string
  @text('sync_status') status!: string
  @date('created_at') createdAt!: Date
  @date('updated_at') updatedAt!: Date

  @relation('registros', 'registro_id') registro!: any
}

export class Registro extends Model {
  static table = 'registros'
  static associations = {
    foto_registros: { type: 'has_many' as const, foreignKey: 'registro_id' },
  }

  @field('empresa_id') empresaId!: number
  @field('usuario_id') usuarioId!: number
  @text('tipo') tipo!: string
  @date('data_hora') dataHora!: Date
  @text('descricao') descricao!: string
  @text('sync_status') status!: string
  @date('created_at') createdAt!: Date
  @date('updated_at') updatedAt!: Date

  @children('foto_registros') fotos!: Query<FotoRegistro>
}
