export interface IRegistroRepository {
  existsInCompany(registroId: string, empresaId: number): Promise<boolean>;
}
