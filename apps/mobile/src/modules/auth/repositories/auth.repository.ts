export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  user: {
    keycloakId: string;
    nome?: string;
    email?: string;
  };
};

export interface AuthRepository {
  signIn(): Promise<AuthSession>;
  signOut(): Promise<void>;
  restoreSession(): Promise<AuthSession | null>;
  refreshSession(): Promise<AuthSession | null>;
  getAccessToken(): Promise<string | null>;
}
