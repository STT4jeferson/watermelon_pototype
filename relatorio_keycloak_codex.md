## O que foi implementado

Foi realizada uma refatoração profunda no protótipo original para substituir a gestão de autenticação legada no banco de dados da aplicação por uma solução OAuth2/OIDC nativa e centralizada usando **Keycloak**. 

As seguintes entregas foram concluídas:
- **Infraestrutura**: Adicionado container de Keycloak e seu banco de dados Postgres dedicados, além da persistência e geração pré-configurada de clientes e usuários (`realm-watermelon-local.json`).
- **Backend (Fastify/Node.js)**: Removida lógica de senha e BCrypt, e transformado o backend em um *Resource Server* focado na regra de negócio. Foram instalados `jwks-rsa` para o Fastify e desenvolvidos middlewares de controle (verificando assinaturas contra o issuer do Keycloak e derivando o `AuthenticatedUserContext`).
- **Database (Prisma/MySQL)**: Removido `senha` da tabela `usuario` e substituído por `keycloak_id` mapeado de modo seguro e direto aos identificadores gerados no Keycloak OIDC. As chamadas (`sync/push`, `fotos`, etc.) não dependem mais de identificadores fornecidos pelo payload do client.
- **Mobile (React Native/Expo)**: Instalação e uso do `expo-auth-session` para suportar *Authorization Code Flow com PKCE*. A interface de rede (`http-client.ts`) foi migrada para carregar o Bearer Token das requisições via `expo-secure-store`. A UI do App foi mantida intocada, operando através das chamadas de domínio e interfaces injetadas.

## Arquivos criados/alterados

- `docker-compose.yml`, `.env.example`, `.env`
- `infra/keycloak/realm-watermelon-local.json`
- `apps/backend/prisma/schema.prisma`, `apps/backend/prisma/seed.ts`
- `apps/backend/src/infra/auth/keycloak/keycloak-jwt.validator.ts`, `keycloak-auth.middleware.ts`, `authenticated-user.context.ts`
- `apps/backend/src/modules/auth/routes.ts`, `apps/backend/src/modules/sync/routes.ts`, `apps/backend/src/modules/fotos/routes.ts`
- `apps/mobile/app.json`
- `apps/mobile/src/infra/auth/keycloak.config.ts`, `token-secure-storage.ts`, `keycloak-auth.repository.ts`
- `apps/mobile/src/modules/auth/repositories/auth.repository.ts`
- `apps/mobile/src/infra/http/index.ts`
- `apps/mobile/src/database/schema.ts`, `apps/mobile/src/database/models/index.ts`
- `apps/mobile/src/presentation/screens/LoginScreen.tsx`, `HomeScreen.tsx`, `App.tsx`
- `apps/mobile/src/modules/sync/syncService.ts`
- `README.md` atualizado com documentação extensiva de QA e acesso.

## Como rodar

A subida foi inteiramente conteinerizada para o stack de banco, Keycloak e API através de `docker compose up -d` na raiz.
O backend deve ser incializado subindo as dependências (`npm install`), forçando o schema com `npx prisma db push --accept-data-loss && npx tsx prisma/seed.ts` e rodando através do `npm run dev`.
Para o mobile, executar `npm install && npx expo prebuild` seguido por `npx expo run:android`.

## Como testar login

Ao entrar na versão mobile, ao clicar em "Entrar com Keycloak", ele abrirá uma aba In-App Browser chamando o Identity Provider no seu host com o protocolo do OIDC. Autentique-se com os seeds (`joao@empresa-a.local` / `Test@123456`), o browser deve fechar e a página redirecionar para a "HomeScreen".

## Como testar offline-first

Realize o login online para ganhar o acesso inicial via Token. Desligue a internet, crie registros. Os IDs são criados no Watermelon e não afetam a UI, a flag de "Pendente de Sincronização" fica ativa. Quando você voltar ao modo Online, chame "Sincronizar Manualmente" — a chamada passará o Bearer validado para o backend, o backend identificará seu perfil com o respectivo id local (`joao@...`), injetará em um `userContext` e transacionará tudo com segurança no Prisma. 

## Como testar isolamento por empresa

Autentique como Maria (`maria@empresa-b.local` -> Seed Keycloak, Client App). Faça a criação de um registro "B". Faça logout. Em seguida, acesse como Joao. Perceba que as chamadas na home retornam vazias. O backend valida a relação `Usuario - Empresa` a partir do `keycloakId` que o Keycloak assinou via JWT e repassa isso diretamente para os clauses `Where: { empresaId: userContext.empresaId }` do Prisma, garantindo separação efetiva.

## Decisões arquiteturais

- **Desacoplamento de UI e Auth:** A lógica do AuthRepository foi desenhada no Mobile para separar do `LoginScreen` e injetar a gestão de OIDC sem "amarrar" visualmente.
- **Backend = Resource Server:** É muito melhor confiar em uma subclaim JWT validada criptograficamente do que enviar a "senha" do DB e checar Bcrypt todas as vezes. Toda a lógica transacional é confiável.
- **Storage Dual Mobile:** A sessão legada mantem o nome do usuario e o tenant id base para o Watermelon trabalhar, mas os "tokens valiosos" (accessToken e refreshToken) foram direcionados estritamente para o ambiente de encriptação de chaves gerida por hardware da apple/google pelo `expo-secure-store`.

## Riscos conhecidos

- Sessões Keycloak expiram. O Protótipo não aciona um "silent refresh" contínuo e perfeito ainda (apenas em caso de restart). Se um usuário for trabalhar em modo offline durante muitos dias ele pode ter o token bloqueado e precisará relogar. O App trata isso devolvendo erro e direcionando para login em caso de falha de Refresh, mas do ponto de vista de uso de campo contínuo, a UI poderia ter um cache tolerante com expiração do RefreshToken longa via "Offline Tokens" do Keycloak.
- As portas hardcoded na URL do Emulador (10.0.2.2 vs localhost).

## Melhorias recomendadas para produção

1. **Ativar o `Offline Access` do Keycloak**: Se o app ficar em campo 14, 20 dias, precisaremos adicionar claims de OIDC `offline_access` para manter Refresh Tokens ativos com a sessão morta online.
2. **Refresh Automático Interceptado**: Enriquecer o `http-client` injetando uma camada no axios/fetch que pausa requisições que tomem `401 Unauthorized`, renovem o token junto ao Keycloak na surdina e repitam o call.
3. **Migrações e Sync Avançada**: O Protótipo usa "lastPulledAt" + Last Write Wins na sync do Watermelon. Produção exigirá versionamento rígido (ex: `deleted_at`, soft deletes consolidadas e `server_updated_at`) sem perder o history.
4. **Armazenamento de Fotos via Cloud Storage**: As fotos estão hoje no node /uploads. Se isso for um ambiente com 5 instâncias backend auto-escaláveis, todas as fotos devem subir para um provedor S3-Compatible via Signed URL para evitar gargalos na infra.
5. **Configurações seguras do Keycloak**: Trocar de `start-dev` para production e exigir certificados TLS/HTTPS rigorosos em toda comunicação app -> servidor.