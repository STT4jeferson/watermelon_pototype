# Prompt para Codex — Diagnóstico e correção do Keycloak no protótipo WatermelonDB

## Contexto

Estamos desenvolvendo um protótipo **mobile offline-first** usando:

- **Expo + React Native + TypeScript** no app mobile.
- **WatermelonDB** como banco local.
- **Backend REST** persistindo dados em **MySQL**.
- Execução local via **Docker/Docker Compose** para validação.
- Arquitetura esperada: **Clean Architecture**, **SOLID**, separação clara entre domínio, infraestrutura, autenticação, sincronização e UI.


### Cenário real de teste atualizado

O ambiente local está sendo testado com:

- **Keycloak rodando em container Docker**.
- **Backend e MySQL também previstos para rodar via Docker/Docker Compose**.
- **App mobile rodando em um celular Android físico**, conectado na **mesma rede Wi-Fi/LAN da máquina host** que executa o Docker.

Esse detalhe é crítico: no celular físico, `localhost` e `127.0.0.1` apontam para o próprio celular, não para a máquina que está rodando o Docker. Portanto, o app mobile deve acessar o Keycloak usando o **IP da máquina host na rede local**, por exemplo:

```txt
http://192.168.0.10:8080
```

Não assumir que colocar o container Keycloak na mesma `docker network` resolve o acesso do celular. A rede Docker é interna entre containers. Para o celular físico acessar o Keycloak, o container precisa expor a porta no host e o celular precisa alcançar o IP LAN da máquina host.

Exemplo esperado para device físico:

```txt
Celular Android físico -> http://<IP_LAN_DA_MAQUINA_HOST>:8080/realms/watermelon
Host/browser           -> http://localhost:8080 ou http://<IP_LAN_DA_MAQUINA_HOST>:8080
Backend em Docker      -> http://keycloak:8080 para comunicação interna, quando necessário
```

O Codex deve tratar esse cenário como prioridade, pois o erro atual de `page not found` pode estar relacionado a uma combinação de:

- URL pública incorreta do Keycloak;
- `redirectUri` incompatível com o client no Keycloak;
- Keycloak emitindo `issuer` com `localhost`;
- app mobile tentando acessar `localhost` dentro do celular;
- container exposto apenas internamente ou bloqueado por firewall;
- callback/deep link não registrado corretamente no Android.

O Keycloak já teve algumas implementações iniciais, porém, ao testar o login, estamos recebendo **`page not found` no redirecionamento de autenticação**.

O objetivo desta tarefa é fazer uma análise sênior, encontrar a causa raiz do erro de redirect/callback e entregar uma implementação estável, simples de rodar localmente e preparada para evoluir para produção.

---

## Objetivo principal

Corrigir e consolidar a integração com **Keycloak** no protótipo Watermelon, garantindo:

1. Login via **Authorization Code Flow com PKCE** no app mobile.
2. Redirecionamento/callback funcionando corretamente no ambiente local.
3. Keycloak rodando via Docker Compose com realm, clients, roles e usuário de teste.
4. Backend validando tokens JWT emitidos pelo Keycloak.
5. Sessão mobile segura, compatível com offline-first.
6. README com instruções claras de execução e troubleshooting.

---

## Problema atual

Na hora de testar a autenticação, o fluxo chega no Keycloak, mas no retorno/callback acontece erro de **`page not found`**.

Investigue com prioridade as seguintes hipóteses:

1. `redirectUri` gerado pelo app não bate com o `Valid Redirect URIs` configurado no Keycloak.
2. O app está usando uma URL HTTP de web/dev server em vez de um deep link nativo.
3. O Expo Router não possui a rota/callback esperada pelo redirect.
4. O `scheme` do Expo não está configurado corretamente no `app.json`/`app.config.ts`.
5. O app está rodando em Expo Go, Development Build, Android Emulator ou device físico com URIs diferentes.
6. O Keycloak está apontando para `localhost`, mas o app Android precisa acessar `10.0.2.2` no emulator ou o **IP LAN da máquina host** no celular físico.
7. O Keycloak está dentro do Docker, mas a porta não está exposta corretamente para a rede local do host.
8. O celular físico não consegue abrir `http://<IP_LAN_DA_MAQUINA_HOST>:8080` por bloqueio de firewall, bind incorreto da porta ou rede Wi-Fi isolada.
9. O Keycloak está emitindo metadata/issuer com `localhost`, enquanto o app físico usa `http://<IP_LAN>:8080`, gerando inconsistência no OIDC.
10. O backend usa um issuer diferente do issuer retornado pelo Keycloak, causando falha posterior na validação do token.
11. O Docker Compose expõe o Keycloak corretamente para o host, mas os containers/app usam hosts diferentes.
12. O callback está sendo tratado por rota visual do Expo Router quando deveria ser tratado pelo `expo-auth-session`, ou o inverso.
13. Existe conflito entre `scheme://auth/callback`, `scheme:///auth/callback`, `exp://.../--/callback` e rotas do Expo Router.

---

## Regras técnicas obrigatórias

### Segurança e protocolo

- Use **OpenID Connect / OAuth2**.
- Use **Authorization Code Flow com PKCE**.
- Não use `password grant`/`Resource Owner Password Credentials`.
- Não salve `client secret` no app mobile.
- O client mobile no Keycloak deve ser **public client**.
- Desabilite flows desnecessários no client mobile:
  - Implicit Flow: desabilitado.
  - Direct Access Grants: desabilitado, salvo se houver justificativa técnica muito forte para ambiente local. Por padrão, manter desabilitado.
  - Service Account: desabilitado para mobile.
- Use PKCE com `S256` quando possível.
- Tokens devem ser armazenados com segurança no mobile, preferencialmente usando `expo-secure-store` ou camada já existente equivalente.
- Não armazene senha do usuário localmente.

### Arquitetura

Organize a implementação sem acoplar Keycloak diretamente nas telas.

Sugestão de separação:

```txt
apps/mobile/src/
  domain/
    auth/
      entities/
      repositories/
      use-cases/
  application/
    auth/
      sign-in.use-case.ts
      refresh-session.use-case.ts
      sign-out.use-case.ts
      restore-session.use-case.ts
  infra/
    auth/
      keycloak-auth-provider.ts
      token-storage.secure-store.ts
      auth-session.mapper.ts
  presentation/
    auth/
      login.screen.tsx
      auth-callback.screen.tsx        # se necessário
  shared/
    config/
      env.ts
```

No backend:

```txt
apps/backend/src/
  modules/
    auth/
      keycloak-jwt.validator.ts
      auth.middleware.ts
      current-user.ts
    users/
    sync/
    records/
  shared/
    config/
```

Adapte ao padrão real do repositório, sem criar duplicidade desnecessária.

---

## Parte 1 — Auditoria inicial obrigatória

Antes de alterar código, faça uma análise objetiva do estado atual.

Verifique:

1. Como o Keycloak foi adicionado ao Docker Compose.
2. Se existe import de realm.
3. Nome do realm configurado.
4. Clients existentes.
5. Redirect URIs configurados.
6. Web Origins configurados.
7. Configuração de `scheme` do Expo.
8. Uso de `expo-auth-session`, `expo-web-browser`, `Linking`, `expo-router` ou alguma lib de OIDC.
9. Onde o `redirectUri` é gerado.
10. Qual `redirectUri` real aparece em runtime.
11. Qual URL de authorization está sendo aberta.
12. Qual URL o Keycloak usa no callback.
13. Se o callback cai em rota inexistente do Expo Router.
14. Se o erro acontece no navegador, no WebBrowser do Expo, no app ou no backend.
15. Se o app está rodando em:
    - Expo Go;
    - Expo Development Build;
    - Android Emulator;
    - Android físico;
    - iOS Simulator;
    - web.

Crie logs temporários, se necessário, com prefixos claros:

```ts
console.log('[AUTH][KEYCLOAK_DISCOVERY]', discovery);
console.log('[AUTH][REDIRECT_URI]', redirectUri);
console.log('[AUTH][AUTHORIZATION_URL]', request?.url);
console.log('[AUTH][RESPONSE]', response);
```

Remova logs sensíveis ou normalize antes do commit final. Nunca logar `access_token`, `refresh_token`, senha ou authorization code completo.

---

## Parte 2 — Correção do redirect/callback

### 2.1. Definir uma estratégia local única para redirect

Para ambiente local com Development Build, prefira uma URI nativa estável, por exemplo:

```txt
watermelon://auth/callback
```

ou, se o projeto exigir path absoluto no Expo Router:

```txt
watermelon:///auth/callback
```

O Codex deve descobrir qual formato o projeto realmente está usando e padronizar.

No `app.json` ou `app.config.ts`, garantir algo equivalente:

```ts
export default {
  expo: {
    name: 'Watermelon Prototype',
    slug: 'watermelon-prototype',
    scheme: 'watermelon',
    android: {
      package: 'com.watermelon.prototype'
    },
    ios: {
      bundleIdentifier: 'com.watermelon.prototype'
    }
  }
};
```

Depois de alterar `scheme`, o app precisa ser rebuildado:

```bash
npx expo prebuild --clean
npx expo run:android
```

ou pelo fluxo EAS/dev-client já usado no projeto.

### 2.2. Gerar o redirectUri de forma explícita

Usar `expo-auth-session` de forma previsível.

Exemplo de referência, adaptar ao projeto:

```ts
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'watermelon',
  path: 'auth/callback'
});
```

Se o retorno real precisar de três barras:

```ts
const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'watermelon',
  path: 'auth/callback',
  isTripleSlashed: true
});
```

O importante é: **o valor real logado em runtime precisa ser exatamente o mesmo cadastrado no Keycloak**.

### 2.3. Evitar page not found no Expo Router

Se o projeto usa Expo Router e o callback está caindo em uma rota visual, garantir que exista uma rota segura.

Possíveis caminhos:

```txt
apps/mobile/app/auth/callback.tsx
```

ou:

```txt
apps/mobile/src/app/auth/callback.tsx
```

ou conforme a estrutura real do projeto.

Essa tela pode ser simples:

```tsx
export default function AuthCallbackScreen() {
  return null;
}
```

ou exibir loading:

```tsx
export default function AuthCallbackScreen() {
  return <LoadingScreen message="Finalizando autenticação..." />;
}
```

Mas antes de criar tela, verifique se o `expo-auth-session` já captura o retorno sem precisar de rota. Não criar callback visual se isso for desnecessário para a arquitetura real.

### 2.4. Configurar Keycloak com os redirect URIs corretos

No client mobile do Keycloak, garantir:

```txt
Client ID: watermelon-mobile
Client type/access: public
Standard flow: enabled
Direct access grants: disabled
Implicit flow: disabled
Valid Redirect URIs:
  watermelon://auth/callback
  watermelon:///auth/callback
  exp://127.0.0.1:*/--/auth/callback        # apenas se Expo Go for suportado localmente
  exp://localhost:*/--/auth/callback        # apenas se Expo Go for suportado localmente
Web Origins:
  +
```

Atenção:

- Em produção, remover wildcards amplos.
- Para o protótipo local, wildcards podem ser aceitos apenas quando documentados como temporários.
- Não usar `*` indiscriminadamente em produção.

---

## Parte 3 — Docker Compose, rede local e Keycloak acessível pelo celular físico

Validar ou implementar serviço Keycloak no `docker-compose.yml`, considerando explicitamente que o teste principal será feito em **celular Android físico na mesma rede da máquina host**.

### 3.1. Entendimento obrigatório de rede

Não confundir estes três contextos:

```txt
1. Rede Docker interna
   backend -> keycloak:8080
   mysql -> nome do serviço MySQL

2. Máquina host
   navegador do notebook/desktop -> localhost:8080
   ou -> <IP_LAN_DA_MAQUINA_HOST>:8080

3. Celular físico na mesma rede
   app/browser do celular -> <IP_LAN_DA_MAQUINA_HOST>:8080
```

O celular físico **não acessa** `keycloak:8080`, `localhost:8080` nem `127.0.0.1:8080` da máquina host. Para o celular, `localhost` é o próprio celular.

Portanto, o Codex deve:

1. Identificar o IP LAN da máquina host. Exemplos:

```bash
ip addr show
hostname -I
ip route get 8.8.8.8
```

2. Validar que o Keycloak está acessível pelo host usando:

```bash
curl http://localhost:8080/realms/watermelon/.well-known/openid-configuration
curl http://<IP_LAN_DA_MAQUINA_HOST>:8080/realms/watermelon/.well-known/openid-configuration
```

3. Validar manualmente no navegador do celular físico:

```txt
http://<IP_LAN_DA_MAQUINA_HOST>:8080
http://<IP_LAN_DA_MAQUINA_HOST>:8080/realms/watermelon/.well-known/openid-configuration
```

4. Se o celular não abrir a URL, investigar antes de alterar o fluxo OIDC:

```txt
[ ] Máquina e celular estão na mesma rede Wi-Fi/LAN
[ ] Roteador não possui isolamento de clientes/AP isolation
[ ] Firewall do Linux/Windows/macOS permite entrada na porta 8080
[ ] Docker publicou a porta no host, preferencialmente 0.0.0.0:8080->8080
[ ] Não há outro serviço usando a porta 8080
[ ] VPN/proxy não está isolando a interface de rede
```

### 3.2. Docker Compose de referência

Exemplo de referência, adaptar à estrutura real:

```yaml
services:
  keycloak:
    image: quay.io/keycloak/keycloak:26
    container_name: watermelon-keycloak
    command:
      - start-dev
      - --import-realm
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_HTTP_ENABLED: 'true'
      KC_HOSTNAME_STRICT: 'false'
      # Para teste com celular físico, NÃO fixar hostname como localhost.
      # Se for necessário fixar hostname/canonical URL, usar o IP LAN da máquina host via .env:
      # KC_HOSTNAME: ${KEYCLOAK_PUBLIC_HOSTNAME}
    ports:
      # Garantir publicação no host, acessível pela LAN quando firewall permitir.
      - '0.0.0.0:8080:8080'
    volumes:
      - ./infra/keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json:ro
    networks:
      - watermelon-network

networks:
  watermelon-network:
    driver: bridge
```

Se o backend em container precisar acessar serviços no host em Linux, avaliar:

```yaml
extra_hosts:
  - 'host.docker.internal:host-gateway'
```

Mas para comunicação backend -> Keycloak, preferir a rede Docker interna:

```txt
http://keycloak:8080
```

Para comunicação celular -> Keycloak, usar sempre a URL pública LAN:

```txt
http://<IP_LAN_DA_MAQUINA_HOST>:8080
```

### 3.3. Configuração de hostname/issuer no Keycloak

Este é um ponto crítico. O Keycloak pode emitir URLs de discovery, authorization endpoint e issuer baseadas no hostname recebido ou configurado.

O Codex deve verificar no `.well-known/openid-configuration` qual `issuer` está sendo retornado para cada URL:

```bash
curl http://localhost:8080/realms/watermelon/.well-known/openid-configuration | jq .issuer
curl http://<IP_LAN_DA_MAQUINA_HOST>:8080/realms/watermelon/.well-known/openid-configuration | jq .issuer
```

Para teste com celular físico, a URL canônica local recomendada deve ser:

```txt
KEYCLOAK_PUBLIC_URL=http://<IP_LAN_DA_MAQUINA_HOST>:8080
KEYCLOAK_ISSUER=http://<IP_LAN_DA_MAQUINA_HOST>:8080/realms/watermelon
```

O app mobile deve usar essa URL pública. O backend pode usar `http://keycloak:8080` para buscar JWKS internamente, mas deve validar o `issuer` real presente no token.

Não resolver o problema aceitando qualquer issuer sem validação. O correto é padronizar uma URL pública local para o ambiente de device físico e documentá-la.

---

## Parte 4 — Realm importável

Criar ou corrigir um realm importável em:

```txt
infra/keycloak/realm-export.json
```

ou caminho equivalente.

Configuração mínima esperada:

- Realm: `watermelon`
- Client mobile público: `watermelon-mobile`
- Client/backend resource server: `watermelon-backend` ou validação por audience/issuer no backend.
- Roles mínimas:
  - `app_user`
  - `app_admin`, se fizer sentido no protótipo.
- Usuário de teste:
  - username/email: `demo@watermelon.local`
  - senha: `Demo@123456`
  - email verified: `true`
  - role: `app_user`

Evite versionar senhas reais. Para protótipo local, documentar que o usuário é apenas para desenvolvimento.

Exemplo conceitual de client mobile no realm export:

```json
{
  "clientId": "watermelon-mobile",
  "name": "Watermelon Mobile",
  "enabled": true,
  "publicClient": true,
  "protocol": "openid-connect",
  "standardFlowEnabled": true,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": false,
  "serviceAccountsEnabled": false,
  "redirectUris": [
    "watermelon://auth/callback",
    "watermelon:///auth/callback"
  ],
  "webOrigins": ["+"],
  "attributes": {
    "pkce.code.challenge.method": "S256"
  }
}
```

Ajuste os campos conforme o formato real aceito pelo Keycloak na versão usada no projeto.

---

## Parte 5 — Configuração de URLs por ambiente

Criar uma estratégia clara para URLs, porque esse é um ponto comum de falha em ambiente local.

### URLs sugeridas por ambiente

```txt
Host/browser:
  KEYCLOAK_URL=http://localhost:8080
  ou, para simular o mesmo host do celular:
  KEYCLOAK_URL=http://<IP_LAN_DA_MAQUINA_HOST>:8080

Android Emulator:
  KEYCLOAK_URL=http://10.0.2.2:8080

Android físico na mesma rede Wi-Fi/LAN:
  KEYCLOAK_URL=http://<IP_LAN_DA_MAQUINA_HOST>:8080

Backend em Docker:
  KEYCLOAK_INTERNAL_URL=http://keycloak:8080
  KEYCLOAK_PUBLIC_URL=http://<IP_LAN_DA_MAQUINA_HOST>:8080
  KEYCLOAK_PUBLIC_ISSUER=http://<IP_LAN_DA_MAQUINA_HOST>:8080/realms/watermelon
```

O Codex deve validar o que funciona no projeto real e documentar.

Atenção especial ao `issuer`:

```txt
http://localhost:8080/realms/watermelon
http://10.0.2.2:8080/realms/watermelon
http://192.168.x.x:8080/realms/watermelon
```

Esses valores podem gerar tokens com `iss` diferente dependendo da configuração do Keycloak e do host usado na requisição. O backend deve validar o issuer correto. Não mascarar esse problema aceitando qualquer issuer sem critério.

Critério esperado:

- Definir uma URL pública canônica para o Keycloak local.
- Usar essa URL no app mobile sempre que possível.
- Configurar backend para validar o issuer dessa URL.
- Quando houver diferença entre URL interna do container e URL pública, separar variáveis:

```env
KEYCLOAK_REALM=watermelon
KEYCLOAK_PUBLIC_URL=http://<IP_LAN_DA_MAQUINA_HOST>:8080
KEYCLOAK_INTERNAL_URL=http://keycloak:8080
KEYCLOAK_ISSUER=http://<IP_LAN_DA_MAQUINA_HOST>:8080/realms/watermelon
KEYCLOAK_JWKS_URI=http://keycloak:8080/realms/watermelon/protocol/openid-connect/certs
```

---

## Parte 6 — Implementação mobile esperada

### Bibliotecas preferenciais

Usar preferencialmente:

```bash
npx expo install expo-auth-session expo-web-browser expo-secure-store
```

### Fluxo esperado

1. LoginScreen chama use case `signIn`.
2. Use case chama provider OIDC/Keycloak.
3. Provider abre browser com Authorization Code + PKCE.
4. App recebe callback via deep link/AuthSession.
5. Provider troca authorization code por tokens.
6. Tokens são armazenados em SecureStore.
7. Estado de sessão é atualizado.
8. App consulta `/me` ou endpoint equivalente no backend usando Bearer token.
9. Dados mínimos do usuário são salvos no estado local/sessão.
10. Sync offline-first passa a usar token válido para pull/push.

### Exemplo conceitual

Adapte ao padrão do projeto:

```ts
const discovery = await AuthSession.fetchDiscoveryAsync(
  `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}`
);

const redirectUri = AuthSession.makeRedirectUri({
  scheme: env.APP_SCHEME,
  path: 'auth/callback'
});

const request = new AuthSession.AuthRequest({
  clientId: env.KEYCLOAK_CLIENT_ID,
  scopes: ['openid', 'profile', 'email', 'offline_access'],
  redirectUri,
  responseType: AuthSession.ResponseType.Code,
  usePKCE: true
});

await request.makeAuthUrlAsync(discovery);

const result = await request.promptAsync(discovery, {
  useProxy: false
});
```

Depois trocar o code por token de forma segura, respeitando o contrato da lib usada.

### Sessão e offline-first

Implementar comportamento explícito:

- Se existe sessão válida, permitir entrada no app.
- Se access token expirou e há internet, tentar refresh token.
- Se não há internet e o usuário já tinha sessão local, permitir acesso aos dados locais, mas bloquear operações que exigem servidor até reconectar.
- Se não há sessão local, não permitir login offline.
- Sync deve pausar ou enfileirar quando token inválido/expirado e refresh não for possível.
- Logout deve limpar tokens e estado de sessão. Avaliar se dados locais do WatermelonDB devem ser apagados ou mantidos por usuário, documentando a decisão.

---

## Parte 7 — Backend: validação JWT

O backend deve validar tokens do Keycloak antes de permitir operações protegidas.

Implementar middleware de autenticação que valide:

1. Assinatura JWT via JWKS do Keycloak.
2. `iss` esperado.
3. Expiração (`exp`).
4. Audience/client adequado, quando aplicável.
5. Roles ou claims necessárias.

Não confiar apenas em decode sem validação criptográfica.

Sugestão com libs modernas do ecossistema Node:

- `jose`
- ou `jwks-rsa` + biblioteca JWT já usada no projeto.

Exemplo conceitual:

```ts
const authHeader = request.headers.authorization;

if (!authHeader?.startsWith('Bearer ')) {
  throw new UnauthorizedError('Missing bearer token');
}

const token = authHeader.replace('Bearer ', '');

// Validar assinatura, issuer, expiração e claims.
const payload = await keycloakJwtValidator.validate(token);

request.user = {
  id: payload.sub,
  email: payload.email,
  username: payload.preferred_username,
  roles: extractRoles(payload)
};
```

Proteger endpoints obrigatórios:

```txt
GET /me
GET /sync/pull
POST /sync/push
POST /records
POST /records/:id/photos
```

ou os equivalentes existentes no projeto.

---

## Parte 8 — Checklist específico para o erro `page not found`

O Codex deve executar este checklist e registrar no relatório final:

### A. Descobrir o redirect real

Adicionar log temporário e identificar o valor real:

```txt
[AUTH][REDIRECT_URI] = ?
```

Comparar exatamente com Keycloak.

### B. Testar deep link manualmente

Rodar:

```bash
npx uri-scheme list
npx uri-scheme open watermelon://auth/callback --android
```

Se usar três barras:

```bash
npx uri-scheme open watermelon:///auth/callback --android
```

Resultado esperado:

- O app abre.
- Não cai em page not found.
- Se existir tela callback, ela renderiza loading ou redireciona corretamente.

### C. Validar discovery do Keycloak

Rodar no host:

```bash
curl http://localhost:8080/realms/watermelon/.well-known/openid-configuration
```

No Android Emulator, validar acesso equivalente usando `10.0.2.2` dentro do app.

### D. Validar client no Keycloak

No Admin Console, conferir:

```txt
Realm: watermelon
Client: watermelon-mobile
Client authentication: Off
Standard flow: On
Valid redirect URIs: contém exatamente o redirect real
Web origins: correto para ambiente local
PKCE: S256
```

### E. Validar Expo Router

Conferir se a URI final é interpretada como:

```txt
watermelon://auth/callback
```

ou:

```txt
watermelon:///auth/callback
```

E se isso exige rota:

```txt
/auth/callback
```

Se exigir, criar rota compatível.

### F. Validar host do Keycloak no celular físico

Verificar se o app não está tentando abrir:

```txt
http://localhost:8080
http://127.0.0.1:8080
http://keycloak:8080
```

em Android físico ou Android emulator de forma incorreta.

Para Android emulator, geralmente usar:

```txt
http://10.0.2.2:8080
```

Para device físico, usar:

```txt
http://<IP_LAN_DA_MAQUINA_HOST>:8080
```

Validações obrigatórias para device físico:

```bash
# No host
curl http://<IP_LAN_DA_MAQUINA_HOST>:8080/realms/watermelon/.well-known/openid-configuration

# No celular, abrir no navegador
http://<IP_LAN_DA_MAQUINA_HOST>:8080/realms/watermelon/.well-known/openid-configuration
```

Se funcionar no host mas não no celular, o problema é rede/firewall/bind de porta, não é ainda AuthSession.

Validar publicação da porta:

```bash
docker compose ps
docker port watermelon-keycloak
ss -ltnp | grep 8080
```

O resultado esperado é algo equivalente a:

```txt
0.0.0.0:8080->8080/tcp
```

### G. Validar onde o erro aparece

Classificar o erro:

```txt
[ ] Page not found no browser antes de voltar para o app
[ ] Page not found dentro do Expo Router depois do callback
[ ] Invalid redirect_uri no Keycloak
[ ] Erro de issuer/audience no backend depois do login
[ ] App não recebe callback
[ ] Browser retorna mas AuthSession não completa
```

A correção depende dessa classificação.

---

## Parte 9 — Testes obrigatórios

### Testes manuais

1. Subir ambiente:

```bash
docker compose up -d
```

2. Acessar Keycloak Admin no host:

```txt
http://localhost:8080
```

3. Validar realm `watermelon`.
4. Validar client `watermelon-mobile`.
5. Descobrir IP LAN da máquina host e validar acesso pelo host:

```bash
hostname -I
curl http://<IP_LAN_DA_MAQUINA_HOST>:8080/realms/watermelon/.well-known/openid-configuration
```

6. No navegador do celular físico, abrir:

```txt
http://<IP_LAN_DA_MAQUINA_HOST>:8080
http://<IP_LAN_DA_MAQUINA_HOST>:8080/realms/watermelon/.well-known/openid-configuration
```

7. Configurar o app mobile com:

```env
EXPO_PUBLIC_KEYCLOAK_URL=http://<IP_LAN_DA_MAQUINA_HOST>:8080
```

8. Rodar app mobile em Development Build no celular físico.
9. Clicar em Entrar.
10. Login com usuário demo.
11. Confirmar retorno ao app sem `page not found`.
12. Confirmar que tokens foram armazenados com segurança.
13. Confirmar chamada autenticada no backend:

```txt
GET /me
```

14. Fechar e abrir app novamente.
15. Confirmar restore de sessão.
16. Expirar access token ou simular refresh.
17. Confirmar refresh token.
18. Testar logout.
19. Testar tentativa de sync sem token.
20. Testar tentativa de sync com token válido.
21. Desligar internet após sessão válida e confirmar comportamento offline-first esperado.

### Testes automatizados sugeridos

Criar testes unitários para:

- `TokenStorage`.
- `AuthSessionMapper`.
- `RestoreSessionUseCase`.
- `RefreshSessionUseCase`.
- `KeycloakJwtValidator` no backend.
- Middleware de autenticação.
- Extração de roles.

Criar testes de integração no backend para:

```txt
GET /me sem token -> 401
GET /me com token inválido -> 401
GET /me com token válido -> 200
POST /sync/push sem token -> 401
POST /sync/push com token válido -> 200/201 conforme regra
```

Se gerar token real no teste for complexo, separar:

- Teste unitário do validator com JWKS mockado.
- Teste de integração real opcional usando Keycloak do Docker Compose.

---

## Parte 10 — README obrigatório

Atualizar README com seção de autenticação.

Incluir:

### Como subir o ambiente

```bash
docker compose up -d
```

### Como acessar Keycloak

```txt
URL: http://localhost:8080
Admin: admin
Senha: admin
Realm: watermelon
```

### Usuário de teste

```txt
Login: demo@watermelon.local
Senha: Demo@123456
```

### Como rodar o app mobile

Explicar que WatermelonDB normalmente exige Development Build, não Expo Go puro.

Exemplo:

```bash
npx expo prebuild
npx expo run:android
```

ou o comando real do projeto.

### Como configurar `.env`

Exemplo:

```env
EXPO_PUBLIC_APP_SCHEME=watermelon
# Android Emulator:
# EXPO_PUBLIC_KEYCLOAK_URL=http://10.0.2.2:8080

# Celular Android físico na mesma rede da máquina host:
EXPO_PUBLIC_KEYCLOAK_URL=http://<IP_LAN_DA_MAQUINA_HOST>:8080
EXPO_PUBLIC_KEYCLOAK_REALM=watermelon
EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=watermelon-mobile

KEYCLOAK_REALM=watermelon
KEYCLOAK_PUBLIC_URL=http://<IP_LAN_DA_MAQUINA_HOST>:8080
KEYCLOAK_INTERNAL_URL=http://keycloak:8080
KEYCLOAK_ISSUER=http://<IP_LAN_DA_MAQUINA_HOST>:8080/realms/watermelon
KEYCLOAK_JWKS_URI=http://keycloak:8080/realms/watermelon/protocol/openid-connect/certs
```

Documentar variações:

```txt
Android Emulator -> http://10.0.2.2:8080
Android físico -> http://<IP_LAN_DA_MAQUINA_HOST>:8080
Host/browser -> http://localhost:8080 ou http://<IP_LAN_DA_MAQUINA_HOST>:8080
Backend em Docker -> http://keycloak:8080 para JWKS/discovery interno, validando issuer público
```

### Troubleshooting de redirect

Criar tabela:

| Sintoma | Causa provável | Correção |
|---|---|---|
| `page not found` após login | Rota de callback inexistente ou URI com path diferente | Conferir `redirectUri` real e rota Expo Router |
| `invalid_redirect_uri` | URI não cadastrada no Keycloak | Adicionar URI exata no client |
| App não volta após login | `scheme` não registrado ou app não rebuildado | Configurar `scheme`, rodar prebuild/rebuild |
| Funciona no navegador do host, falha no celular físico | Uso incorreto de `localhost` ou porta não acessível pela LAN | Usar `http://<IP_LAN_DA_MAQUINA_HOST>:8080`, publicar porta em `0.0.0.0` e liberar firewall |
| Funciona no Android Emulator, falha no celular físico | App configurado com `10.0.2.2`, que só vale para emulator | Trocar para IP LAN da máquina host |
| Funciona no navegador, falha no Android | Uso incorreto de `localhost` | Usar `10.0.2.2` no emulator ou IP da máquina no device físico |
| Backend rejeita token | `issuer` diferente | Padronizar URL pública/issuer ou ajustar validação |
| AuthSession não completa | Falta `WebBrowser.maybeCompleteAuthSession()` | Adicionar no entrypoint correto |

---

## Parte 11 — Critérios de aceite

A tarefa só deve ser considerada concluída quando:

1. `docker compose up -d` sobe Keycloak, backend e MySQL sem erros críticos.
2. O Keycloak está acessível no celular físico via `http://<IP_LAN_DA_MAQUINA_HOST>:8080`.
3. Realm `watermelon` é importado automaticamente.
4. Client `watermelon-mobile` existe e usa public client + PKCE.
5. Usuário demo consegue autenticar.
6. App mobile abre o browser, autentica e volta para o app sem `page not found`.
7. O `redirectUri` real está documentado no README.
8. O `.well-known/openid-configuration` funciona pelo IP LAN no navegador do celular.
9. Backend valida JWT real do Keycloak, respeitando o `issuer` público correto.
10. Endpoint protegido retorna 401 sem token.
11. Endpoint protegido retorna sucesso com token válido.
12. Sessão é restaurada após fechar/reabrir app.
13. Logout limpa tokens locais.
14. Sync offline-first não tenta enviar dados sem sessão válida.
15. README explica Android Emulator, device físico, rede Docker interna e host local.
16. Não existem tokens, secrets ou senhas reais versionados.
17. Implementação mantém separação de responsabilidades e não acopla Keycloak às telas.

---

## Parte 12 — Entregáveis esperados

Ao finalizar, entregar:

1. Resumo da causa raiz do `page not found`.
2. Arquivos alterados.
3. Decisões técnicas tomadas.
4. Como testar o login localmente.
5. Como testar backend protegido.
6. Limitações conhecidas do ambiente local.
7. Próximos passos para hardening de produção.

Formato do relatório final esperado:

```md
# Relatório — Correção Keycloak Watermelon

## Causa raiz

...

## Correção aplicada

...

## Arquivos alterados

...

## Redirect URI final

...

## Como testar

...

## Evidências

...

## Pontos de atenção para produção

...
```

---

## Pontos de atenção para produção

Não implementar agora se estiver fora do escopo, mas deixar documentado:

- Usar HTTPS obrigatório.
- Remover wildcards de redirect URI.
- Remover credenciais demo.
- Configurar hostname público estável do Keycloak.
- Configurar rotação e tempos de expiração de tokens.
- Avaliar refresh token rotation.
- Avaliar MFA para usuários administrativos.
- Separar realms/clients por ambiente: local, staging, production.
- Criar pipeline para import/export controlado do realm.
- Observabilidade de falhas de login sem vazar dados sensíveis.

---

## Referências oficiais úteis

- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/index.html
- Keycloak JavaScript Adapter / OIDC concepts: https://www.keycloak.org/securing-apps/javascript-adapter
- Expo AuthSession: https://docs.expo.dev/versions/latest/sdk/auth-session/
- Expo Authentication Guide: https://docs.expo.dev/guides/authentication/

Use essas referências apenas como base. A implementação final deve respeitar a estrutura real do repositório.
