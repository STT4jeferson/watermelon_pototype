# Protótipo Mobile Offline-First com WatermelonDB

Este é um protótipo completo de aplicativo mobile offline-first construído com **Expo (React Native), TypeScript, WatermelonDB**, acompanhado de um backend em **Fastify (Node.js), Prisma e MySQL**.

O sistema implementa o isolamento de dados por empresa e o fluxo de sincronização offline-first (`pullChanges` / `pushChanges`) com suporte a uploads de fotos associadas aos registros de maneira transacional e resiliente.

## Requisitos

- Node.js (v18+)
- npm, yarn ou pnpm
- Docker e Docker Compose (para banco de dados MySQL local)
- Expo CLI (`npm i -g expo-cli` ou via `npx`)
- Android Studio / Emulador ou Dispositivo Físico configurado

---

## Como subir o Backend

O backend foi construído com Fastify, Prisma e MySQL.

1. Navegue até a pasta do backend:
   ```bash
   cd apps/backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o MySQL via Docker Compose (na raiz do projeto):
   ```bash
   cd ../../
   docker compose up -d
   cd apps/backend
   ```
4. Crie o arquivo `.env` (ou copie de `.env.example` da raiz):
   ```bash
   cp ../../.env.example .env
   ```
5. Rode as migrations e popule o banco (Seeds):
   ```bash
   npx prisma migrate dev
   npx tsx prisma/seed.ts
   ```
6. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
   > O servidor estará rodando em `http://localhost:3333`. (Para o emulador Android, a requisição no app é feita para `http://10.0.2.2:3333`).

---

## Como rodar o App (Mobile)

O App mobile foi construído usando o template TypeScript do Expo e utiliza o **WatermelonDB**.
Devido ao uso de dependências nativas pelo WatermelonDB, **o projeto não roda no Expo Go puro**. É necessário fazer a build de desenvolvimento.

1. Navegue até a pasta do mobile:
   ```bash
   cd apps/mobile
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie a pasta `android` / `ios` nativa:
   ```bash
   npx expo prebuild
   ```
4. Execute o aplicativo (exemplo no Android):
   ```bash
   npx expo run:android
   ```
   *Ou inicie o Dev Client:*
   ```bash
   npx expo start --dev-client
   ```

---

## Como testar Login e Isolamento por Empresa

O *Seed* do Prisma criou duas empresas e dois usuários distintos no banco de dados.

**Usuário da Empresa A:**
- Login: `usuario_a`
- Senha: `123456`

**Usuário da Empresa B:**
- Login: `usuario_b`
- Senha: `123456`

- O backend valida cada token e restringe a visibilidade. Ao autenticar com o usuário da Empresa A, todas as operações (busca, sincronização, criação) afetam **apenas** a Empresa A. O mesmo vale para a Empresa B.

---

## Como testar Offline / Online

1. Suba o backend e o app conforme os passos acima.
2. Faça login no app usando `usuario_a`.
3. Crie um novo registro com a rede ativa. Ele será sincronizado imediatamente com o backend.
4. **Ative o modo avião** no emulador ou dispositivo.
5. Crie novos registros offline.
6. Anexe fotos nesses registros (da galeria ou câmera).
7. Note na lista da tela inicial que o registro aparece com o status de **Pendente de sincronização**.
8. **Desative o modo avião**.
9. O status da conexão mudará para "Online". Clique no botão **"Sincronizar Manualmente"** ou aguarde uma sincronização automática.
10. O status dos registros locais irá mudar para `synced`. E as fotos estarão fisicamente na pasta `uploads/` do seu backend, com a URL devidamente salva no MySQL.
11. Faça Logout.
12. Faça Login com `usuario_b` e confirme que ele não consegue ver os registros da Empresa A.
