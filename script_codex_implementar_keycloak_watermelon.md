# Script para Codex — Implementação do Keycloak no Protótipo WatermelonDB Offline-First

## Contexto

Você atuará como um engenheiro sênior responsável por implementar autenticação com **Keycloak** em um protótipo full stack local, executado via **Docker**, com:

- App mobile em **React Native + TypeScript**.
- Banco local mobile com **WatermelonDB**.
- Backend **API REST**.
- Banco remoto **MySQL**.
- Sincronização offline-first entre app e backend.
- Arquitetura orientada a **Clean Architecture, SOLID, escalabilidade, segurança e robustez para produção**.

Este projeto ainda **não possui Keycloak configurado**. A implementação deve considerar que é a primeira configuração do Keycloak do zero, portanto a entrega precisa ser clara, documentada, reproduzível e madura.

---

## Escopo funcional original do protótipo

O sistema deve entregar:

1. Código fonte do app mobile React Native.
2. Código fonte do backend REST persistindo dados em MySQL.
3. Instruções simples de execução no README.
4. App funcional offline-first com WatermelonDB.
5. Login com sessão persistida localmente.
6. Usuários vinculados a empresas diferentes.
7. Isolamento de dados por empresa.
8. Cadastro de registros de compra/venda com data/hora, descrição e múltiplas fotos.
9. Sincronização de registros e fotos criados offline.

---

## Objetivo desta tarefa

Implementar o **Keycloak como provedor central de identidade e autenticação**, rodando localmente via Docker, integrando:

- Keycloak.
- Backend REST.
- MySQL da aplicação.
- App React Native.
- Persistência local da sessão.
- Isolamento multiempresa.
- Fluxo offline-first seguro.

A solução deve preparar o protótipo para uma evolução futura em produção, evitando atalhos inseguros como senha em texto puro, autenticação improvisada no backend ou acoplamento direto entre UI e Keycloak.

---

## Decisão arquitetural obrigatória

### Antes

O escopo original dizia:

> Usuário e senha devem ser validados contra dados vindos do backend/MySQL.

### Agora, com Keycloak

A autenticação deve ser centralizada no **Keycloak**.

O backend **não deve validar senha diretamente** contra MySQL.

O MySQL deve armazenar os dados de domínio da aplicação, como:

- Empresas.
- Usuários de domínio.
- Vínculo usuário → empresa.
- Registros.
- Fotos.
- Metadados de sincronização.

O Keycloak deve armazenar e validar:

- Credenciais.
- Identidade.
- Sessão.
- Tokens OIDC/OAuth2.

A tabela `usuario` do MySQL deve representar o usuário dentro do domínio da aplicação, vinculado ao usuário autenticado no Keycloak através de um campo como:

```sql
keycloak_id VARCHAR(64) NOT NULL UNIQUE
```

Não armazenar senha em texto puro no MySQL.

Se for necessário manter compatibilidade com o escopo do teste, usar uma destas abordagens:

1. Remover o campo `senha` e documentar no README que a responsabilidade de autenticação foi transferida para o Keycloak; ou
2. Manter um campo `senha_hash` legado, nullable e não utilizado no fluxo principal, explicando que o Keycloak é a fonte real de autenticação.

Priorizar a opção 1, salvo se o projeto/teste exigir explicitamente a presença do campo.

---

## Resultado esperado

Ao final, o projeto deve permitir:

1. Subir toda a stack local com Docker.
2. Acessar o painel administrativo do Keycloak.
3. Ter um realm local configurado automaticamente.
4. Ter um client público para o app mobile.
5. Ter usuários seedados no Keycloak.
6. Ter empresas e usuários de domínio seedados no MySQL.
7. Fazer login no app mobile via Keycloak.
8. Salvar a sessão de forma segura no dispositivo.
9. Pular a tela de login quando existir sessão local válida.
10. Consumir o backend com Bearer Token JWT.
11. Validar o token no backend.
12. Resolver o usuário logado no backend pelo `sub` do token.
13. Garantir que cada usuário só veja e envie registros da própria empresa.
14. Continuar permitindo criação/edição offline no app.
15. Sincronizar dados quando a conexão voltar.
16. Documentar tudo no README.

---

# Parte 1 — Infraestrutura Docker

## Tarefa

Criar ou ajustar a infraestrutura local com Docker Compose para subir todos os serviços necessários.

## Serviços esperados

Criar um `docker-compose.yml` ou ajustar o existente para incluir:

1. `mysql-app`
   - Banco MySQL da aplicação.
   - Persistência via volume.
   - Seeds iniciais.

2. `keycloak-db`
   - Banco dedicado do Keycloak.
   - Preferencialmente Postgres.
   - Não misturar banco de autenticação com banco de domínio da aplicação.

3. `keycloak`
   - Imagem oficial do Keycloak.
   - Rodando localmente.
   - Realm importado automaticamente.
   - Admin local configurado por variáveis de ambiente.

4. `backend`
   - API REST da aplicação.
   - Conectada ao MySQL.
   - Configurada para validar tokens emitidos pelo Keycloak.

5. Opcional: `adminer` ou `phpmyadmin`
   - Apenas para facilitar inspeção local do MySQL.

## Regras de maturidade

- Não usar dados sensíveis hardcoded fora de arquivos `.env.example`.
- Criar `.env.example` com todas as variáveis necessárias.
- Não versionar `.env` real.
- Usar volumes nomeados para persistência local.
- Criar healthchecks quando possível.
- Garantir ordem saudável de inicialização com `depends_on` e `condition: service_healthy`, se o Docker Compose utilizado suportar.
- Não usar `latest` em imagens Docker sem justificativa. Fixar versões estáveis no `.env.example` ou no compose.
- Documentar a diferença entre configuração local e produção.

## Estrutura sugerida

```txt
.
├── docker-compose.yml
├── .env.example
├── infra/
│   ├── keycloak/
│   │   └── realm-watermelon-local.json
│   ├── mysql/
│   │   ├── init.sql
│   │   └── seed.sql
│   └── README.md
├── backend/
└── mobile/
```

## Variáveis sugeridas

```env
# Geral
NODE_ENV=development
APP_ENV=local

# MySQL aplicação
MYSQL_DATABASE=watermelon_app
MYSQL_USER=watermelon_user
MYSQL_PASSWORD=watermelon_password
MYSQL_ROOT_PASSWORD=root_password
MYSQL_PORT=3306

# Keycloak DB
KEYCLOAK_DB=keycloak
KEYCLOAK_DB_USER=keycloak
KEYCLOAK_DB_PASSWORD=keycloak_password

# Keycloak
KEYCLOAK_IMAGE=quay.io/keycloak/keycloak:<fixar-versao-estavel>
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
KEYCLOAK_PORT=8080
KEYCLOAK_REALM=watermelon-local
KEYCLOAK_ISSUER=http://localhost:8080/realms/watermelon-local
KEYCLOAK_MOBILE_CLIENT_ID=watermelon-mobile

# Backend
BACKEND_PORT=3000
DATABASE_URL=mysql://watermelon_user:watermelon_password@mysql-app:3306/watermelon_app
OIDC_ISSUER=http://keycloak:8080/realms/watermelon-local
OIDC_JWKS_URI=http://keycloak:8080/realms/watermelon-local/protocol/openid-connect/certs
OIDC_AUDIENCE=watermelon-backend
```

Atenção: para o app mobile rodando em emulador Android ou dispositivo físico, o endereço `localhost` pode não apontar para o host da máquina. Documentar claramente:

- Android Emulator: usar `http://10.0.2.2:8080` para acessar serviços do host.
- Dispositivo físico: usar o IP da máquina na rede local, por exemplo `http://192.168.x.x:8080`.
- iOS Simulator: geralmente consegue acessar `http://localhost:8080`, mas validar no README.

Criar configuração por ambiente no mobile para evitar trocar URLs manualmente.

---

# Parte 2 — Configuração inicial do Keycloak

## Tarefa

Criar um realm local importável automaticamente pelo container do Keycloak.

Arquivo esperado:

```txt
infra/keycloak/realm-watermelon-local.json
```

## Realm

Nome sugerido:

```txt
watermelon-local
```

## Usuários seed obrigatórios

Criar 2 usuários no Keycloak, cada um associado a uma empresa diferente.

Exemplo:

### Usuário 1

```txt
Nome: João Empresa A
Login/E-mail: joao@empresa-a.local
Senha: Test@123456
Empresa: Empresa A
```

### Usuário 2

```txt
Nome: Maria Empresa B
Login/E-mail: maria@empresa-b.local
Senha: Test@123456
Empresa: Empresa B
```

Os usuários devem ser criados com IDs fixos no realm import, para facilitar o seed consistente no MySQL.

Exemplo conceitual:

```txt
joao_keycloak_id = 11111111-1111-1111-1111-111111111111
maria_keycloak_id = 22222222-2222-2222-2222-222222222222
```

## Atributos de usuário no Keycloak

Adicionar atributos úteis, sem transformar o Keycloak em banco de domínio completo:

```txt
empresa_codigo=EMPRESA_A
empresa_id=1
```

```txt
empresa_codigo=EMPRESA_B
empresa_id=2
```

Esses atributos podem ser usados para debug e claims opcionais, mas a autorização final no backend deve ser resolvida preferencialmente pela tabela `usuario` do MySQL usando o `keycloak_id`.

## Client mobile

Criar client público:

```txt
Client ID: watermelon-mobile
Client type: OpenID Connect
Access type/capability: public client
Authentication flow: Authorization Code Flow
PKCE: obrigatório, método S256
```

Configurar redirect URIs para o app mobile.

Sugestão para app standalone/dev-client:

```txt
com.watermelonprototype://auth
```

Sugestões para Expo Go/dev local, se necessário:

```txt
exp://127.0.0.1:8081/*
exp://localhost:8081/*
```

Preferir **Expo Dev Client** ou build nativo com scheme próprio em vez de depender permanentemente de Expo Go.

## Client backend

Criar client lógico para representar a API:

```txt
Client ID: watermelon-backend
```

O backend deve atuar como resource server validando Bearer Tokens emitidos pelo Keycloak.

Não implementar fluxo de login no backend usando usuário/senha.

O backend deve validar:

- Assinatura do JWT.
- Issuer.
- Expiração.
- Audience, quando aplicável.
- Claims necessárias.

## Client opcional para testes locais via curl/Postman

Criar um client separado apenas para testes locais, se necessário:

```txt
Client ID: watermelon-local-cli
```

Esse client pode ter Direct Access Grants habilitado somente para facilitar testes automatizados locais.

Regras:

- Não usar esse client no app mobile.
- Documentar que ele é exclusivo para ambiente local.
- Em produção, não usar Resource Owner Password Credentials Flow.

---

# Parte 3 — Modelagem MySQL da aplicação

## Tarefa

Ajustar ou criar schema MySQL para suportar autenticação via Keycloak, multiempresa e sincronização offline.

## Tabelas obrigatórias do escopo

### `empresa`

```sql
CREATE TABLE empresa (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(64) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
);
```

### `usuario`

```sql
CREATE TABLE usuario (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  keycloak_id VARCHAR(64) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  login VARCHAR(255) NOT NULL UNIQUE,
  empresa_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_usuario_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresa(id)
);
```

Não criar coluna `senha` em texto puro.

Se a avaliação exigir a coluna por causa do escopo original, usar:

```sql
senha_hash VARCHAR(255) NULL
```

E documentar que ela não é usada no fluxo principal com Keycloak.

### `registro`

Para offline-first, preferir IDs estáveis gerados no cliente.

```sql
CREATE TABLE registro (
  id CHAR(36) PRIMARY KEY,
  empresa_id BIGINT NOT NULL,
  usuario_id BIGINT NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  data_hora DATETIME NOT NULL,
  descricao TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_registro_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresa(id),
  CONSTRAINT fk_registro_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT chk_registro_tipo
    CHECK (tipo IN ('COMPRA', 'VENDA'))
);
```

### `foto_registro`

```sql
CREATE TABLE foto_registro (
  id CHAR(36) PRIMARY KEY,
  registro_id CHAR(36) NOT NULL,
  empresa_id BIGINT NOT NULL,
  usuario_id BIGINT NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NULL,
  tamanho_bytes BIGINT NULL,
  storage_path TEXT NOT NULL,
  remote_url TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_foto_registro
    FOREIGN KEY (registro_id) REFERENCES registro(id),
  CONSTRAINT fk_foto_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresa(id),
  CONSTRAINT fk_foto_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);
```

## Seeds obrigatórios

Criar 2 empresas:

```sql
INSERT INTO empresa (id, codigo, nome) VALUES
(1, 'EMPRESA_A', 'Empresa A'),
(2, 'EMPRESA_B', 'Empresa B');
```

Criar 2 usuários de domínio vinculados aos IDs fixos do Keycloak:

```sql
INSERT INTO usuario (keycloak_id, nome, login, empresa_id) VALUES
('11111111-1111-1111-1111-111111111111', 'João Empresa A', 'joao@empresa-a.local', 1),
('22222222-2222-2222-2222-222222222222', 'Maria Empresa B', 'maria@empresa-b.local', 2);
```

---

# Parte 4 — Backend REST com validação JWT

## Tarefa

Integrar o backend REST ao Keycloak como resource server.

## Regra central

Nenhum endpoint protegido deve confiar em `empresa_id` ou `usuario_id` enviados pelo app.

O backend deve:

1. Receber o Bearer Token.
2. Validar o JWT contra o Keycloak.
3. Extrair o `sub` do token.
4. Buscar o usuário no MySQL:

```sql
SELECT usuario.*, empresa.*
FROM usuario
JOIN empresa ON empresa.id = usuario.empresa_id
WHERE usuario.keycloak_id = ?
  AND usuario.deleted_at IS NULL
```

5. Criar um `AuthenticatedUserContext` contendo:

```ts
type AuthenticatedUserContext = {
  keycloakId: string;
  usuarioId: number;
  empresaId: number;
  login: string;
  nome: string;
};
```

6. Aplicar esse contexto em todos os casos de uso protegidos.

## Middleware de autenticação

Criar uma camada de infraestrutura para validação do token:

```txt
backend/src/infra/auth/keycloak/
├── keycloak-jwt.validator.ts
├── keycloak-auth.middleware.ts
├── authenticated-user.context.ts
└── auth.errors.ts
```

Responsabilidades:

- Baixar JWKS do Keycloak.
- Cachear chaves públicas.
- Validar assinatura e claims.
- Rejeitar tokens expirados.
- Rejeitar issuer inválido.
- Rejeitar audience inválida quando configurada.
- Retornar 401 para token ausente/inválido.
- Retornar 403 para usuário autenticado sem vínculo válido no domínio.

## Endpoints mínimos esperados

### Saúde

```http
GET /health
```

Não precisa de autenticação.

### Perfil logado

```http
GET /me
Authorization: Bearer <access_token>
```

Retorno esperado:

```json
{
  "id": 1,
  "keycloakId": "11111111-1111-1111-1111-111111111111",
  "nome": "João Empresa A",
  "login": "joao@empresa-a.local",
  "empresa": {
    "id": 1,
    "codigo": "EMPRESA_A",
    "nome": "Empresa A"
  }
}
```

### Registros

```http
GET /registros
POST /registros
PUT /registros/:id
DELETE /registros/:id
```

Todos protegidos.

Regras:

- `GET /registros` retorna apenas registros da empresa do usuário logado.
- `POST /registros` força `empresa_id` e `usuario_id` a partir do token/contexto.
- `PUT` e `DELETE` só podem alterar registros da empresa do usuário logado.
- Não aceitar alteração manual de `empresa_id` pelo body.

### Fotos

```http
POST /registros/:id/fotos
GET /registros/:id/fotos
DELETE /registros/:id/fotos/:fotoId
```

Regras:

- Foto só pode ser enviada para registro pertencente à empresa do usuário logado.
- Persistir arquivo localmente em volume Docker para protótipo.
- Separar interface de storage para permitir trocar por S3/MinIO no futuro.

Exemplo de abstração:

```ts
interface FileStorage {
  save(input: SaveFileInput): Promise<SavedFile>;
  delete(path: string): Promise<void>;
  getPublicUrl(path: string): string | null;
}
```

---

# Parte 5 — Backend e WatermelonDB Sync

## Tarefa

Implementar endpoints compatíveis com o protocolo de sincronização do WatermelonDB.

## Endpoints sugeridos

```http
GET /sync/pull?lastPulledAt=<timestamp>&schemaVersion=<version>&migration=<json>
POST /sync/push
```

Ou, se preferir seguir semântica REST mais explícita:

```http
POST /sync/pull
POST /sync/push
```

Manter consistência com o client mobile.

## Regras de segurança na sync

A sync deve ser multiempresa por padrão.

O backend deve aplicar automaticamente:

```txt
empresa_id = authenticatedUser.empresaId
```

Nunca aceitar `empresa_id` vindo do app como fonte de verdade.

## Pull changes

O pull deve retornar apenas alterações da empresa do usuário logado.

Formato conceitual:

```json
{
  "changes": {
    "empresas": {
      "created": [],
      "updated": [],
      "deleted": []
    },
    "usuarios": {
      "created": [],
      "updated": [],
      "deleted": []
    },
    "registros": {
      "created": [],
      "updated": [],
      "deleted": []
    },
    "foto_registros": {
      "created": [],
      "updated": [],
      "deleted": []
    }
  },
  "timestamp": 1730000000000
}
```

Regras:

- Usar `updated_at` e `deleted_at` para detectar alterações.
- Retornar deletados como IDs.
- Garantir que o timestamp retornado seja gerado pelo servidor.
- Evitar drift usando tempo do servidor.
- Nunca retornar dados de outra empresa.

## Push changes

O push deve aceitar registros criados/alterados/deletados localmente.

Regras:

- Validar cada payload.
- Forçar `empresa_id` e `usuario_id` pelo usuário autenticado.
- Rejeitar tentativa de alterar registro de outra empresa.
- Tratar idempotência.
- Suportar retry sem duplicar registros.
- Validar `tipo IN ('COMPRA', 'VENDA')`.
- Validar descrição com mínimo de 10 caracteres.
- Gravar soft delete quando possível.

## Conflitos

Implementar uma estratégia simples e documentada para o protótipo.

Sugestão inicial:

```txt
Last-write-wins por updated_at do servidor, com proteção de tenant.
```

Mas documentar os riscos e deixar um ponto de extensão para evoluir para:

- Versionamento por linha.
- Revisões.
- Resolução manual de conflitos.
- Event sourcing simplificado.

---

# Parte 6 — App Mobile React Native + Keycloak

## Tarefa

Implementar autenticação no app mobile com Keycloak usando Authorization Code Flow com PKCE.

## Bibliotecas sugeridas

Verificar o stack atual do projeto antes de instalar dependências.

Sugestões comuns para Expo/React Native:

```bash
npx expo install expo-auth-session expo-web-browser expo-secure-store
npm install jwt-decode
```

Se o projeto não usa Expo, escolher alternativa compatível com React Native puro, mantendo PKCE e browser externo.

## Regras de segurança mobile

- Não usar senha diretamente em chamadas ao backend.
- Não implementar Resource Owner Password Flow no app mobile.
- Não salvar access token em AsyncStorage.
- Salvar tokens em armazenamento seguro, como SecureStore no Expo.
- Salvar perfil local/estado de domínio no WatermelonDB ou storage apropriado.
- Implementar logout limpando tokens e estado local sensível.
- Implementar refresh token quando online.
- Tratar sessão expirada de forma clara.

## Configuração de scheme

No `app.json`, `app.config.ts` ou equivalente, configurar scheme:

```json
{
  "expo": {
    "scheme": "com.watermelonprototype"
  }
}
```

Redirect URI esperado:

```txt
com.watermelonprototype://auth
```

## Arquitetura esperada no app

Evitar acoplar a UI diretamente ao Keycloak.

Criar camadas:

```txt
mobile/src/
├── domain/
│   ├── auth/
│   │   ├── entities/
│   │   │   └── auth-session.ts
│   │   ├── repositories/
│   │   │   └── auth.repository.ts
│   │   └── use-cases/
│   │       ├── sign-in.usecase.ts
│   │       ├── sign-out.usecase.ts
│   │       ├── restore-session.usecase.ts
│   │       └── refresh-session.usecase.ts
│   └── user/
├── application/
│   ├── auth/
│   │   └── auth.service.ts
│   └── sync/
├── infra/
│   ├── auth/
│   │   ├── keycloak-auth.repository.ts
│   │   ├── token-secure-storage.ts
│   │   └── keycloak.config.ts
│   ├── http/
│   │   ├── http-client.ts
│   │   └── auth-interceptor.ts
│   └── database/
│       └── watermelon/
└── presentation/
    ├── screens/
    │   ├── login.screen.tsx
    │   └── registro-input.screen.tsx
    └── state/
        └── auth.store.ts
```

## Interface de domínio

```ts
export interface AuthRepository {
  signIn(): Promise<AuthSession>;
  signOut(): Promise<void>;
  restoreSession(): Promise<AuthSession | null>;
  refreshSession(): Promise<AuthSession | null>;
  getAccessToken(): Promise<string | null>;
}
```

## Entidade de sessão

```ts
export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  user: {
    keycloakId: string;
    nome?: string;
    email?: string;
  };
};
```

## Fluxo de login

1. Usuário toca em Entrar.
2. App abre navegador seguro com tela do Keycloak.
3. Usuário informa login e senha no Keycloak.
4. Keycloak redireciona para o scheme do app.
5. App troca authorization code por tokens.
6. Tokens são salvos em SecureStore.
7. App chama `GET /me` no backend.
8. Backend resolve usuário e empresa.
9. App persiste perfil local.
10. App navega para tela principal.

## Pular tela de login

Ao abrir o app:

1. Restaurar tokens do SecureStore.
2. Verificar expiração do access token.
3. Se expirado e online, tentar refresh.
4. Se offline e já existe usuário local autenticado anteriormente, permitir uso offline com política local definida.
5. Se não houver sessão local, exibir login.

## Política offline sugerida

Implementar política clara:

- O usuário só pode operar offline se já tiver feito login ao menos uma vez.
- O app deve manter `lastAuthenticatedAt` local.
- Permitir operação offline por uma janela configurável, por exemplo 7 dias.
- Sincronização só deve ocorrer com token válido.
- Se o token estiver expirado e o app estiver online, tentar refresh antes de sincronizar.
- Se refresh falhar, bloquear sync e pedir novo login.

---

# Parte 7 — Integração HTTP no app

## Tarefa

Criar client HTTP centralizado para o backend.

## Regras

- Todo endpoint protegido deve receber `Authorization: Bearer <access_token>`.
- Interceptor deve tentar refresh uma vez em caso de 401.
- Se refresh falhar, encerrar sessão e redirecionar para login.
- Não espalhar lógica de token por telas.
- Não permitir que telas informem `empresa_id` manualmente.

## Exemplo conceitual

```ts
const response = await httpClient.get('/me');
```

A tela não deve precisar saber como o token é anexado.

---

# Parte 8 — WatermelonDB no app

## Tarefa

Ajustar models e schema local para refletir o domínio com multiempresa e sync.

## Models esperados

- `Empresa`
- `Usuario`
- `Registro`
- `FotoRegistro`

## Campos recomendados para sync local

### Registro local

```ts
{
  id: string;
  empresaId: number;
  usuarioId: number;
  tipo: 'COMPRA' | 'VENDA';
  dataHora: number;
  descricao: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'ERROR';
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}
```

### Foto local

```ts
{
  id: string;
  registroId: string;
  empresaId: number;
  usuarioId: number;
  localPath: string;
  remoteUrl?: string;
  mimeType?: string;
  tamanhoBytes?: number;
  syncStatus: 'PENDING' | 'SYNCED' | 'ERROR';
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}
```

## Regras offline

- Criar registro sem internet.
- Editar registro sem internet.
- Anexar múltiplas fotos sem internet.
- Persistir fotos em diretório controlado do app.
- Mostrar status de sync na lista.
- Ao voltar a conexão, executar sync manual ou automática.
- Nunca perder dados locais se sync falhar.

---

# Parte 9 — Tela de Login

## Tarefa

Implementar ou ajustar tela de login.

## Observação importante

Com Keycloak, a tela local de login pode ter duas possibilidades:

### Opção recomendada

Tela local simples com botão:

```txt
Entrar com Keycloak
```

Ao clicar, abrir fluxo OIDC no navegador.

### Opção alternativa

Manter campos locais de usuário e senha apenas se o escopo da avaliação exigir visualmente.

Mesmo assim, não enviar usuário/senha para o backend.

Nesse caso, ao clicar em Entrar, redirecionar para Keycloak ou explicar tecnicamente no README que a autenticação segura é delegada ao provedor OIDC.

Preferir a opção recomendada.

## Validações

Se houver campos locais, validar obrigatoriedade.

Se for apenas botão Keycloak, validar erros do fluxo:

- Login cancelado.
- Rede indisponível.
- Keycloak indisponível.
- Redirect URI inválida.
- Sessão expirada.

---

# Parte 10 — Tela principal de input

## Tarefa

Garantir que a tela principal continue atendendo ao escopo funcional.

## Campos obrigatórios

1. Tipo
   - Compra → `COMPRA`
   - Venda → `VENDA`

2. Data/hora
   - Salvar como datetime/timestamp.

3. Descrição
   - Mínimo 10 caracteres.

4. Fotos múltiplas
   - Galeria.
   - Câmera.
   - Mais de uma foto por registro.

5. Lista local
   - Tipo.
   - Data/hora.
   - Descrição.
   - Status de sincronização.

## Regras com autenticação

- O registro local deve ser associado ao usuário logado.
- O app não deve permitir criar registro sem sessão local restaurada.
- Em modo offline, usar o usuário local persistido anteriormente.
- Na sincronização, o backend sempre deve sobrescrever/validar empresa e usuário pelo token.

---

# Parte 11 — README obrigatório

Criar ou atualizar README com instruções claras.

## Conteúdo mínimo

### 1. Visão geral

Explicar:

- App mobile.
- Backend.
- MySQL.
- Keycloak.
- WatermelonDB.
- Offline-first.

### 2. Requisitos

Exemplo:

```txt
Docker
Docker Compose
Node.js
npm/yarn/pnpm
Expo CLI ou EAS/Dev Client, conforme o projeto
Android Studio/emulador ou dispositivo físico
```

### 3. Subir ambiente local

```bash
cp .env.example .env
docker compose up --build
```

### 4. Acessos locais

```txt
Backend: http://localhost:3000
Keycloak: http://localhost:8080
Keycloak Admin: admin / admin
MySQL: localhost:3306
```

### 5. Usuários de teste

```txt
Usuário A: joao@empresa-a.local
Senha: Test@123456
Empresa: Empresa A

Usuário B: maria@empresa-b.local
Senha: Test@123456
Empresa: Empresa B
```

### 6. Rodar app mobile

Documentar variações:

- Android emulator.
- Dispositivo físico.
- iOS simulator, se aplicável.

Incluir instrução sobre URLs:

```txt
Android Emulator usa 10.0.2.2 para acessar serviços do host.
Dispositivo físico precisa usar o IP da máquina na rede local.
```

### 7. Testar autenticação

Passos:

1. Abrir app.
2. Clicar em Entrar.
3. Login no Keycloak com usuário A.
4. Ver tela principal.
5. Criar registros.
6. Sair.
7. Login com usuário B.
8. Confirmar que registros da empresa A não aparecem.

### 8. Testar offline

Passos:

1. Fazer login online.
2. Criar um registro.
3. Desligar internet.
4. Criar outro registro com foto.
5. Ver status pendente.
6. Religar internet.
7. Clicar em Sincronizar ou aguardar sync automática.
8. Confirmar status sincronizado.
9. Validar no MySQL.

### 9. Testar isolamento por empresa

Passos:

1. Login com usuário A.
2. Criar registro A.
3. Sincronizar.
4. Logout.
5. Login com usuário B.
6. Confirmar que registro A não aparece.
7. Tentar chamar API manualmente enviando `empresa_id` da outra empresa.
8. Confirmar que backend ignora/rejeita tentativa.

### 10. Decisões de arquitetura

Documentar:

- Por que Keycloak substitui validação de senha no MySQL.
- Por que tokens ficam em SecureStore.
- Por que backend resolve empresa pelo token e não pelo body.
- Como a sync protege multiempresa.
- Limitações conhecidas do protótipo.
- Próximos passos para produção.

---

# Parte 12 — Testes mínimos

## Backend

Criar testes para:

1. Middleware rejeita token ausente.
2. Middleware rejeita token inválido.
3. Middleware aceita token válido.
4. `/me` retorna usuário correto.
5. Usuário A não acessa dados da empresa B.
6. POST registro ignora `empresa_id` enviado no body.
7. Sync pull retorna apenas dados da empresa do usuário.
8. Sync push não permite alterar registro de outra empresa.

## Mobile

Criar testes ou ao menos organizar código para testar:

1. Restore session.
2. Logout limpa sessão.
3. HTTP client injeta token.
4. Sync não roda sem sessão válida.
5. Registro criado offline fica pendente.
6. Registro sincronizado muda status.

## Manual QA

Adicionar no README um roteiro manual com:

- Login feliz.
- Login cancelado.
- Keycloak indisponível.
- Token expirado.
- Offline antes do login.
- Offline depois do login.
- Troca de usuário.
- Isolamento de empresas.
- Sync com foto.

---

# Parte 13 — Critérios de aceite

A tarefa só deve ser considerada concluída quando:

- `docker compose up --build` sobe MySQL, Keycloak e backend.
- Realm do Keycloak é importado automaticamente.
- Existem 2 usuários seedados no Keycloak.
- Existem 2 empresas e 2 usuários de domínio seedados no MySQL.
- O app consegue abrir fluxo de login com Keycloak.
- O app armazena sessão de forma segura.
- O app pula login quando há sessão válida.
- O backend valida Bearer Token.
- O backend resolve usuário pelo `sub` do token.
- O usuário A não vê dados da empresa B.
- O usuário B não vê dados da empresa A.
- Registros criados offline não são perdidos.
- Sync funciona após reconexão.
- Fotos ficam associadas ao registro mesmo offline.
- README permite outro desenvolvedor rodar o projeto do zero.

---

# Parte 14 — Pontos de atenção para produção

Documentar explicitamente no relatório final:

1. Trocar `start-dev` do Keycloak por configuração própria de produção.
2. Usar HTTPS obrigatório.
3. Configurar hostname fixo do Keycloak.
4. Rotacionar secrets.
5. Não usar admin/admin fora de local.
6. Revisar tempos de expiração de tokens.
7. Avaliar offline tokens com cautela.
8. Usar storage real para fotos, como S3 ou MinIO.
9. Criar migrations versionadas para MySQL.
10. Adicionar observabilidade.
11. Adicionar rate limit no backend.
12. Adicionar logs auditáveis de autenticação e sync.
13. Implementar estratégia mais robusta de conflitos.
14. Implementar refresh token rotation, se aplicável.
15. Automatizar import/export do realm por pipeline.

---

# Parte 15 — Ordem de implementação sugerida

Siga esta ordem para reduzir risco:

1. Inspecionar estrutura atual do projeto.
2. Identificar stack real do backend e mobile.
3. Criar `.env.example`.
4. Criar Docker Compose com MySQL, Keycloak DB, Keycloak e backend.
5. Criar realm importável do Keycloak.
6. Criar seeds MySQL alinhados com IDs fixos do Keycloak.
7. Subir ambiente e validar Keycloak Admin.
8. Implementar middleware JWT no backend.
9. Implementar endpoint `/me`.
10. Proteger endpoints de registros.
11. Proteger sync pull/push por empresa.
12. Implementar client Auth no mobile.
13. Implementar SecureStore para tokens.
14. Implementar restore session.
15. Integrar HTTP client com token.
16. Ajustar fluxo offline-first.
17. Testar isolamento multiempresa.
18. Testar offline/sync.
19. Atualizar README.
20. Entregar relatório final com decisões, riscos e próximos passos.

---

# Parte 16 — Relatório final esperado do Codex

Ao final da implementação, gere um relatório em Markdown com:

```txt
## O que foi implementado

## Arquivos criados/alterados

## Como rodar

## Como testar login

## Como testar offline-first

## Como testar isolamento por empresa

## Decisões arquiteturais

## Riscos conhecidos

## Melhorias recomendadas para produção
```

---

# Observações finais

A prioridade desta implementação não é apenas “fazer login funcionar”.

A prioridade é criar uma base correta para um app offline-first com autenticação centralizada, isolamento multiempresa e backend protegido por token, mantendo Clean Architecture e SOLID.

Evite soluções acopladas, atalhos inseguros ou lógica de autorização no frontend.

A autorização real deve estar no backend.

O frontend pode melhorar experiência, mas não pode ser a barreira de segurança.
