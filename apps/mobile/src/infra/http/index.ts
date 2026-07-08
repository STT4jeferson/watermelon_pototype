import { TokenSecureStorage } from '../auth/token-secure-storage';
import { getDynamicApiUrl } from '../auth/keycloak.config';

export const api = {
  async get(endpoint: string) {
    const token = await TokenSecureStorage.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${getDynamicApiUrl()}${endpoint}`, { headers });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async post(endpoint: string, body: any) {
    const token = await TokenSecureStorage.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${getDynamicApiUrl()}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
  
  async postFormData(endpoint: string, formData: FormData) {
    const token = await TokenSecureStorage.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${getDynamicApiUrl()}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }
};
