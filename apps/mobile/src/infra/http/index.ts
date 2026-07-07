import { storage } from '../storage';

// Try using the LAN IP instead of 10.0.2.2 in case you are on a physical device
const API_URL = 'http://192.168.15.24:3333'; 

export const api = {
  async get(endpoint: string) {
    const session = await storage.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, { headers });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async post(endpoint: string, body: any) {
    const session = await storage.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
  
  async postFormData(endpoint: string, formData: FormData) {
    const session = await storage.getSession();
    const headers: Record<string, string> = {};
    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }
};
