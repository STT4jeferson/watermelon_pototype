import * as SecureStore from 'expo-secure-store';

// Variáveis de ambiente como fallback estático
const ENV_KEYCLOAK_URL = process.env.EXPO_PUBLIC_KEYCLOAK_URL || 'http://192.168.15.24:8080';
const ENV_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.15.24:3333';
const REALM = process.env.EXPO_PUBLIC_KEYCLOAK_REALM || 'watermelon-local';
const CLIENT_ID = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID || 'watermelon-mobile';

export const KEYCLOAK_CONFIG = {
  clientId: CLIENT_ID,
  redirectUri: 'com.watermelonprototype://auth/callback',
  get issuer() {
    return `${getDynamicKeycloakUrl()}/realms/${REALM}`;
  }
};

let cachedDynamicIp: string | null = null;

export const setDynamicIp = (ip: string) => {
  cachedDynamicIp = ip;
  SecureStore.setItemAsync('WATERMELON_DYNAMIC_IP', ip).catch(console.error);
};

export const loadDynamicIp = async () => {
  try {
    const ip = await SecureStore.getItemAsync('WATERMELON_DYNAMIC_IP');
    if (ip) cachedDynamicIp = ip;
    return ip;
  } catch {
    return null;
  }
};

export const getDynamicIp = () => {
  return cachedDynamicIp;
};

export const getDynamicKeycloakUrl = () => {
  if (cachedDynamicIp) {
    return `http://${cachedDynamicIp}:8080`;
  }
  return ENV_KEYCLOAK_URL;
};

export const getDynamicApiUrl = () => {
  if (cachedDynamicIp) {
    return `http://${cachedDynamicIp}:3333`;
  }
  return ENV_BACKEND_URL;
};

