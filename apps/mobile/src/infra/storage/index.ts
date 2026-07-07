import * as SecureStore from 'expo-secure-store';

export type LocalSession = {
  token: string;
  user: {
    id: number;
    nome: string;
    login: string;
    empresaId: number;
  };
};

const SESSION_KEY = 'app_session';

export const storage = {
  async saveSession(session: LocalSession): Promise<void> {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  },

  async getSession(): Promise<LocalSession | null> {
    const data = await SecureStore.getItemAsync(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },

  async clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
};
