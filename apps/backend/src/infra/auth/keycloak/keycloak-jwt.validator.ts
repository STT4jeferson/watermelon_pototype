import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: process.env.OIDC_JWKS_URI as string,
  cache: true,
  rateLimit: true,
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err, undefined);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export async function validateToken(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        issuer: process.env.OIDC_ISSUER,
        // Audience validado via custom check depois da verificação principal
        // porque clients publicos como o mobile podem gerar tokens com audiences multiplos ou azp (Authorized Party)
      },
      (err, decoded) => {
        if (err) {
          return reject(err);
        }
        
        const payload = decoded as jwt.JwtPayload;
        const expectedAudience = process.env.OIDC_AUDIENCE;

        // Validamos se o audience existe E se ele é um array que inclui o backend,
        // se é uma string igual ao backend, ou se o azp (Authorized Party) é o mobile
        const aud = payload.aud;
        const azp = payload.azp;

        const hasValidAudience = 
           (Array.isArray(aud) && aud.includes(expectedAudience)) || 
           aud === expectedAudience ||
           aud === 'account' || // Keycloak default fallback audience for public clients
           azp === 'watermelon-mobile'; 

        if (expectedAudience && !hasValidAudience) {
           return reject(new Error(`jwt audience invalid. expected: ${expectedAudience}`));
        }

        resolve(payload);
      }
    );
  });
}
