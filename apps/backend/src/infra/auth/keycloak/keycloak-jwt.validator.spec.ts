import { validateToken } from './keycloak-jwt.validator';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');
jest.mock('jwks-rsa', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getSigningKey: jest.fn(),
    };
  });
});

describe('Keycloak JWT Validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OIDC_AUDIENCE = 'watermelon-backend';
    process.env.OIDC_ISSUER = 'http://localhost:8080/realms/test';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('deve aprovar o token se a audiencia for exata ao OIDC_AUDIENCE', async () => {
    (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
      callback(null, { aud: 'watermelon-backend', sub: 'user-123' });
    });

    const payload = await validateToken('fake-token');
    expect(payload.sub).toBe('user-123');
    expect(payload.aud).toBe('watermelon-backend');
  });

  it('deve aprovar o token se a audiencia for um array que contem o OIDC_AUDIENCE', async () => {
    (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
      callback(null, { aud: ['watermelon-backend', 'other-client'], sub: 'user-123' });
    });

    const payload = await validateToken('fake-token');
    expect(payload.sub).toBe('user-123');
  });

  it('deve aprovar o token se o azp (Authorized Party) for o mobile public client', async () => {
    (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
      // Quando vem do mobile public client, aud não é o backend, mas azp indica de onde veio
      callback(null, { aud: 'account', azp: 'watermelon-mobile', sub: 'user-123' });
    });

    const payload = await validateToken('fake-token');
    expect(payload.sub).toBe('user-123');
    expect(payload.azp).toBe('watermelon-mobile');
  });

  it('deve aprovar o token do fallback do keycloak (aud=account)', async () => {
    (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
      callback(null, { aud: 'account', sub: 'user-123' });
    });

    const payload = await validateToken('fake-token');
    expect(payload.sub).toBe('user-123');
  });

  it('deve rejeitar o token se audience e azp forem desconhecidos', async () => {
    (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
      callback(null, { aud: 'unknown-client', azp: 'hacker-client', sub: 'user-123' });
    });

    await expect(validateToken('fake-token')).rejects.toThrow('jwt audience invalid. expected: watermelon-backend');
  });

  it('deve rejeitar o token se o jwt.verify falhar na assinatura', async () => {
    (jwt.verify as jest.Mock).mockImplementation((token, getKey, options, callback) => {
      callback(new Error('invalid signature'), null);
    });

    await expect(validateToken('fake-token')).rejects.toThrow('invalid signature');
  });
});
