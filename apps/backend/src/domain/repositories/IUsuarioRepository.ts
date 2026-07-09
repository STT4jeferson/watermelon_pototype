export interface UsuarioPerfilDomain {
  id: number;
  keycloakId: string;
  nome: string;
  login: string;
  empresa: {
    id: number;
    codigo: string;
    nome: string;
  };
}

export interface IUsuarioRepository {
  getProfile(usuarioId: number): Promise<UsuarioPerfilDomain | null>;
}
