const { networkInterfaces } = require('os');
const { execSync } = require('child_process');

const nets = networkInterfaces();
let localIp = '127.0.0.1';

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1)
    if (net.family === 'IPv4' && !net.internal) {
       localIp = net.address;
       break;
    }
  }
  if (localIp !== '127.0.0.1') break;
}

console.log('\n\n=========================================================');
console.log('📱 ESCANEIE O QR CODE ABAIXO NO SEU APLICATIVO MOBILE');
console.log('IP da Máquina: ' + localIp);
console.log('=========================================================\n');

try {
  // Use o npx para baixar e executar o qrcode-terminal silenciosamente
  execSync(`npx qrcode-terminal "${localIp}"`, { stdio: 'inherit' });
} catch (e) {
  console.log('Erro ao gerar QR Code. Digite o IP manualmente no app: ' + localIp);
}
console.log('\n=========================================================\n\n');
