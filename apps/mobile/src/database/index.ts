import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import { schema } from './schema'
import { Empresa, Usuario, Registro, FotoRegistro } from './models'

const adapter = new SQLiteAdapter({
  schema,
  jsi: false,
  onSetUpError: error => {
    console.error("WatermelonDB setup error", error)
  }
})

export const database = new Database({
  adapter,
  modelClasses: [
    Empresa,
    Usuario,
    Registro,
    FotoRegistro,
  ],
})
