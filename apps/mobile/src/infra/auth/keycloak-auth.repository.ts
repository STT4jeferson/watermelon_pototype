import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { KEYCLOAK_CONFIG } from '../../infra/auth/keycloak.config';
import { TokenSecureStorage } from '../../infra/auth/token-secure-storage';
import { AuthRepository, AuthSession as AuthSessionType } from '../../modules/auth/repositories/auth.repository';
import { jwtDecode } from 'jwt-decode';

WebBrowser.maybeCompleteAuthSession();

export class KeycloakAuthRepository implements AuthRepository {
  private discovery = {
    authorizationEndpoint: `${KEYCLOAK_CONFIG.issuer}/protocol/openid-connect/auth`,
    tokenEndpoint: `${KEYCLOAK_CONFIG.issuer}/protocol/openid-connect/token`,
    revocationEndpoint: `${KEYCLOAK_CONFIG.issuer}/protocol/openid-connect/revoke`,
    discoveryDocument: `${KEYCLOAK_CONFIG.issuer}/.well-known/openid-configuration`
  };

  async signIn(): Promise<AuthSessionType> {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'com.watermelonprototype',
      path: 'auth/callback'
    });

    const request = new AuthSession.AuthRequest({
      clientId: KEYCLOAK_CONFIG.clientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
    });

    const result = await request.promptAsync(this.discovery);

    if (result.type !== 'success') {
      throw new Error('Falha no login ou cancelado pelo usuário');
    }

    const tokenResult = await AuthSession.exchangeCodeAsync(
      {
        clientId: KEYCLOAK_CONFIG.clientId,
        code: result.params.code,
        redirectUri,
        extraParams: {
          code_verifier: request.codeVerifier || '',
        },
      },
      this.discovery
    );

    await TokenSecureStorage.saveTokens(tokenResult.accessToken, tokenResult.refreshToken);

    const decoded = jwtDecode<any>(tokenResult.accessToken);
    
    return {
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresAt: (decoded.exp || 0) * 1000,
      user: {
        keycloakId: decoded.sub,
        nome: decoded.name || decoded.preferred_username,
        email: decoded.email,
      }
    };
  }

  async signOut(): Promise<void> {
    const accessToken = await TokenSecureStorage.getAccessToken();
    const refreshToken = await TokenSecureStorage.getRefreshToken();
    
    // Revoga a sessão ativamente no Keycloak se houver tokens
    if (accessToken || refreshToken) {
      try {
        const tokenToRevoke = refreshToken || accessToken;
        if (tokenToRevoke) {
           await AuthSession.revokeAsync(
            {
              clientId: KEYCLOAK_CONFIG.clientId,
              token: tokenToRevoke,
            },
            this.discovery
          );
        }
      } catch (e) {
        console.warn('Erro ao revogar sessão no Keycloak', e);
      }
    }

    // Limpa estado local de qualquer jeito
    await TokenSecureStorage.clearTokens();
  }

  async restoreSession(): Promise<AuthSessionType | null> {
    const accessToken = await TokenSecureStorage.getAccessToken();
    const refreshToken = await TokenSecureStorage.getRefreshToken();

    if (!accessToken) return null;

    try {
      const decoded = jwtDecode<any>(accessToken);
      const expiresAt = (decoded.exp || 0) * 1000;

      // Se expirou, tenta renovar (poderia chamar refreshSession aqui se quisesse ser automático)
      if (Date.now() > expiresAt && refreshToken) {
         return await this.refreshSession();
      }

      return {
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresAt,
        user: {
          keycloakId: decoded.sub,
          nome: decoded.name || decoded.preferred_username,
          email: decoded.email,
        }
      };
    } catch {
      return null;
    }
  }

  async refreshSession(): Promise<AuthSessionType | null> {
    const refreshToken = await TokenSecureStorage.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const tokenResult = await AuthSession.refreshAsync(
        {
          clientId: KEYCLOAK_CONFIG.clientId,
          refreshToken,
        },
        this.discovery
      );

      await TokenSecureStorage.saveTokens(tokenResult.accessToken, tokenResult.refreshToken);

      const decoded = jwtDecode<any>(tokenResult.accessToken);

      return {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresAt: (decoded.exp || 0) * 1000,
        user: {
          keycloakId: decoded.sub,
          nome: decoded.name || decoded.preferred_username,
          email: decoded.email,
        }
      };
    } catch (error) {
      await this.signOut();
      return null;
    }
  }

  async getAccessToken(): Promise<string | null> {
    return TokenSecureStorage.getAccessToken();
  }
}
