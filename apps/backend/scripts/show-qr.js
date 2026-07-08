const { networkInterfaces } = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const nets = networkInterfaces();
let localIp = '127.0.0.1';

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    // Skip over non-IPv4 and internal
    if (net.family === 'IPv4' && !net.internal) {
       localIp = net.address;
       break;
    }
  }
  if (localIp !== '127.0.0.1') break;
}

// Atualizar o arquivo .env raiz com o IP dinâmico da máquina
const rootEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(rootEnvPath)) {
  let envContent = fs.readFileSync(rootEnvPath, 'utf8');
  // Se ainda estiver com o placeholder (ou outro IP antigo), substitui
  envContent = envContent.replace(/LAN_IP=.*/g, `LAN_IP=${localIp}`);
  fs.writeFileSync(rootEnvPath, envContent);
}

// Atualizar o arquivo .env do backend para o Validador JWT (Issuer e JWKS)
const backendEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(backendEnvPath)) {
  let backendEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
  // Substitui qualquer IP antigo no OIDC_ISSUER e OIDC_JWKS_URI pelo IP da LAN atual
  backendEnvContent = backendEnvContent.replace(/OIDC_ISSUER="http:\/\/[0-9\.]+:/g, `OIDC_ISSUER="http://${localIp}:`);
  backendEnvContent = backendEnvContent.replace(/OIDC_JWKS_URI="http:\/\/[0-9\.]+:/g, `OIDC_JWKS_URI="http://${localIp}:`);
  fs.writeFileSync(backendEnvPath, backendEnvContent);
}

console.log('\n\n=========================================================');
console.log('📱 ESCANEIE O QR CODE ABAIXO NO SEU APLICATIVO MOBILE');
console.log('IP da Máquina: ' + localIp);
console.log('=========================================================\n');

try {
  // Use o pacote qrcode-terminal local embutido em apps/backend/node_modules
  const qrcode = require('qrcode-terminal');
  qrcode.generate(localIp, { small: true });
} catch (e) {
  console.log('Erro ao gerar QR Code. Digite o IP manualmente no app: ' + localIp);
}
console.log('\n=========================================================\n\n');
