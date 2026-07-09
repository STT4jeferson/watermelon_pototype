# Relatório de Auditoria — SOLID + Clean Architecture

## 1. Resumo executivo

A aplicação está **imatura arquiteturalmente** para o cenário de produção, sendo de fato um "protótipo rápido". Embora a divisão de pastas indique uma tentativa de estruturação (como `presentation`, `infra`, `modules`), na prática não há separação real de responsabilidades (Clean Architecture). No Mobile, a UI acessa diretamente o banco de dados local (WatermelonDB). No Backend, as rotas (Fastify) interagem diretamente com o ORM (Prisma), misturando roteamento, regra de negócio e persistência. Há forte acoplamento e diversas violações aos princípios SOLID. O projeto precisa de uma refatoração incremental para criar as camadas de Domínio e Aplicação (Use Cases).

## 2. Stack identificada

- **Mobile:** React Native / Expo / TypeScript
- **Backend:** Node.js / Fastify / TypeScript
- **Banco local:** WatermelonDB
- **Banco remoto:** MySQL (acessado via Prisma ORM)
- **Auth:** Keycloak (OIDC/OAuth2)
- **Docker:** Utilizado para orquestração da infra local (Keycloak, MySQL, Postgres)

## 3. Estrutura atual do projeto

- **Mobile (`apps/mobile/src`)**: Possui pastas como `presentation` (telas, componentes, theme), `database` (Watermelon models/schemas), `infra` (auth, http, storage, i18n) e `modules`. No entanto, componentes de apresentação, como `NovoRegistroScreen.tsx`, fazem chamadas ativas e diretas à base de dados.
- **Backend (`apps/backend/src`)**: Extremamente enxuto, organizado por módulos lógicos (`fotos`, `auth`, `sync`), mas o conteúdo real reside em arquivos `routes.ts`. Não existem camadas de Service, Controller, Use Case ou Repository. A infra (Prisma, Keycloak) é chamada diretamente pelos handlers do Fastify.

## 4. Pontos positivos encontrados

- **Maturidade da Infra de Autenticação**: O Keycloak está muito bem isolado no Backend usando um middleware próprio (`keycloak-auth.middleware.ts`), que extrai corretamente os perfis do banco ou injeta contexto na requisição.
- **Separação de Storage e HTTP no Mobile**: Existe a abstração da biblioteca base (`infra/http` e `infra/storage`), mesmo que use cases e UI a consumam diretamente.
- **Protocolo de Sincronização (Watermelon)**: O uso das APIs padrão do WatermelonDB no endpoint `/sync` (push/pull), com validação da flag `lastPulledAt`, é um bom começo técnico para a fundação Offline-First.

## 5. Violações de Clean Architecture

| Severidade | Arquivo | Problema | Impacto | Correção recomendada |
|---|---|---|---|---|
| Alta | `NovoRegistroScreen.tsx` | A UI manipula diretamente as coleções do WatermelonDB (`database.write(...)`). | Acoplamento extremo entre UI e persistência. Impossibilita o reuso da lógica de salvamento e testes sem renderizar o componente. | Extrair a lógica de salvamento para um `CreateRegistroUseCase` na camada de `application/`, acessando o DB através de um `RegistroRepository`. |
| Alta | `apps/backend/src/modules/sync/routes.ts` | O roteador HTTP executa queries diretas no Prisma e regras transacionais. | Controllers/Routes não devem conhecer o ORM. Difícil de testar as regras de push/pull sem subir um servidor HTTP e banco real. | Extrair lógica para `PullSyncUseCase` e `PushSyncUseCase` que chamem abstrações de banco (Repositories). |
| Média | `syncService.ts` | Mistura orquestração de banco local (Watermelon), chamadas de API genéricas e uploads multiformato. | A sincronização se torna um "God Service" engessado. | Isolar o cliente HTTP do Watermelon e tratar o fluxo de upload de fotos num serviço focado (ex: `UploadPendingPhotosUseCase`). |
| Alta | Vários (Mobile/Backend) | Inexistência de Entidades de Domínio. Modelos da base de dados são usados como modelos de domínio. | Vazamento de contratos do ORM e do WatermelonDB para toda a aplicação. Mudanças de persistência quebram tudo. | Definir Interfaces (Tipos) puros no `domain/` sem acoplamento a bibliotecas. |

## 6. Violações de SOLID

| Princípio | Severidade | Arquivo | Problema | Correção recomendada |
|---|---|---|---|---|
| SRP (Single Responsability) | Alta | `NovoRegistroScreen.tsx` | Valida form, pega geolocalização/horário, prepara DTOs e persiste no banco em uma transação do WatermelonDB. | Isolar a validação do Form na UI e enviar os dados puros para um UseCase que irá persistir. |
| DIP (Dependency Inversion) | Alta | `backend/modules/sync/routes.ts` | O fluxo depende diretamente da implementação concreta do `prisma.$transaction`. | Criar um `SyncRepository` em `infra/` que implemente a interface abstrata requisitada pelo UseCase de Sync. |
| OCP (Open/Closed) | Média | `syncService.ts` | Adicionar uma nova tabela para sincronizar exige alterar o arquivo `routes.ts` do backend e o script central de sync no app. | Padronizar a resolução dos mapeamentos de Sync no backend ou utilizar repositórios por tipo de entidade. |
| SRP | Média | `apps/backend/src/modules/sync/routes.ts` | As lógicas de processar push de `registros` e `foto_registros` estão engessadas num `if/else` gigante no mesmo arquivo. | Extrair processadores/parsers individuais para cada entidade que precisa ser atualizada no banco. |

## 7. Análise do mobile

- **Riscos React Native / WatermelonDB**: Componentes (`NovoRegistroScreen`) estão engordados e instanciando persistências. O WatermelonDB expõe o `@nozbe/watermelondb` por toda parte.
- **Recomendação**: Adotar o padrão Repository para abstrair as coleções do WatermelonDB (`RegistroRepositoryLocal`). O componente apenas deve despachar uma action ou chamar o UseCase passando os dados do formulário. 
- **Estado e Sync**: O Sync ainda não possui um controle robusto de concorrência. Se acionado duas vezes ou se a conexão cair no meio de um Upload pesado de Fotos, ele dependerá do retry manual do usuário. Faltam locks ou filas em background.

## 8. Análise do backend

- **Riscos API / Prisma**: A falta completa de camadas internas. `fastify.get` ou `fastify.post` executa `prisma.model.create(...)` e `prisma.$transaction(...)`.
- **Recomendação**: Criar `controllers` que extraem os dados de Request/Params/Body, validem (com `zod`), repassando a Use Cases. Os Use Cases acessarão o banco indiretamente por meio do `RegistroRepository` e retornarão Entidades para os Controllers despacharem de volta.
- **Sync**: A idempotência do Push parece aceitável (ele tenta dar `updateMany` ou `create`), mas se der falha parcial no Array de Records, toda a transação falha (o que é bom para consistência, mas ruim para performance com pacotes grandes).

## 9. Análise offline-first

- **Pull Sync**: `lastPulledAt` parece gerido pelo Watermelon, mas o Backend aceita requisições grandes. **Risco de performance** e Timeouts no Backend se as tabelas crescerem muito. Falta paginação nas queries de Sync de grandes volumes do Prisma.
- **Upload de Fotos**: As fotos possuem estado (`status: 'local' | 'uploaded' | 'failed'`), o que é muito bom. Mas o `syncService.ts` executa um loop `for` sequencial no Main Thread/Background do JS que não lidaria bem com 50+ fotos, travando UI ou fechando o app por limitação de RAM em devices fracos.
- **Conflitos**: Não há estratégia clara de detecção de conflitos no Push (LWW - Last Write Wins é implementado implicitamente ao aceitar cego as atualizações de `updated` enviadas do celular). 

## 10. Análise da autenticação Keycloak

- A implementação do Backend é muito boa e isolada (`keycloak-auth.middleware`). O controle de segurança do Token está num local só.
- O Frontend tem o `KeycloakAuthRepository` que orquestra `expo-auth-session` bem isolado do resto da aplicação (DIP aplicado corretamente). No entanto, algumas lógicas misturam armazenamento do Token legado com decodificação direta de `jwtDecode` no repositório.
- **Melhoria**: Transformar os tokens em Entidades (`SessionDomain`) e desacoplar o salvamento no SQLite (para o frontend local offline) do Token Refresh flow.

## 11. Plano de refatoração incremental

### Crítico
- Retirar queries diretas de WatermelonDB (`database.write`) e `api.get` de dentro das Telas (`Presentation`). Mover para camadas de `Application` (UseCases).
- No Backend, remover chamadas `prisma.*` de dentro do arquivo `routes.ts`. Criar `Controllers` e encapsular chamadas de banco num `PrismaRegistryRepository` temporário antes de evoluir pra UseCases inteiros, evitando reescrever tudo do zero.

### Importante
- Implementar validação de Request robusta no Backend utilizando `Zod` nas chamadas de `/sync/push` para garantir contratos rígidos.
- Background Uploads no Mobile: Trocar o laço `for (const foto of fotos)` do `syncService` por uma fila/worker persistente (ex: `expo-background-fetch` / fila offline) ou ao menos usar filas paralelizáveis curtas (`Promise.all` em lotes de 3) com retry policies no Axios/API.

### Desejável
- Implementar testes Unitários para os Use Cases, injetando Repositórios `in-memory`.
- Passar a utilizar um Padrão de Inversão de Controle/Injeção de Dependências puro (ex: `tsyringe` ou injeção manual) para fornecer os Repositories para os UseCases.

## 12. Sugestão de estrutura-alvo

**Mobile**
```text
src/
  presentation/
    screens/ (Apenas Hooks React e UI Components)
    components/
  application/
    useCases/ (Ex: CreateRegistroUseCase.ts, PullSyncUseCase.ts)
  domain/
    entities/ (Ex: Registro.ts, FotoRegistro.ts puras sem ORM)
    repositories/ (Interfaces: IRegistroRepository.ts)
  infrastructure/
    database/ (Watermelon models/schemas/index)
    repositories/ (WatermelonRegistroRepository.ts)
    http/
    auth/
```

**Backend**
```text
src/
  presentation/
    controllers/ (SyncController, AuthController)
    routes/ (Apenas binds do Fastify)
  application/
    useCases/ (ProcessPushChangesUseCase, GetChangesSinceUseCase)
  domain/
    entities/ (Registro.ts)
    repositories/ (IRegistroRepository.ts)
  infrastructure/
    database/ (Prisma implementation, ex: PrismaRegistroRepository.ts)
    auth/ (Keycloak middleware)
```

## 13. Checklist de aceite para produção

- [ ] A tela de formulário ("Novo Registro") não importa ou usa instâncias de banco de dados diretamente.
- [ ] O controlador Fastify (`routes.ts`) usa apenas Use Cases e nenhum ORM Prisma.
- [ ] Upload de fotos implementa concorrência/lote ou executa em fila que suporta interrupções seguras.
- [ ] Entidades puras typescript definem os dados manipulados internamente.
- [ ] Teste automatizado roda o `CreateRegistroUseCase` mockando a infraestrutura de banco de dados (Prisma/Watermelon).
- [ ] `sync/push` do Backend usa DTOs de entrada e tem proteção contra SQL Timeout em grandes lotes.

## 14. Alterações aplicadas

Nenhum arquivo de código foi alterado nesta auditoria, conforme política de evitar refatoração massiva automatizada não-solicitada, mas os diagnósticos focam nos problemas reais e severos descobertos.

## 15. Próximos passos

1. **Apresentar esse diagnóstico ao time e aprovar a estrutura-alvo**.
2. Isolar o ORM WatermelonDB da `NovoRegistroScreen`.
3. Criar a camada `domain` com as interfaces base.
4. Refatorar a rota de `/sync` do Backend em `Controller -> Use Case -> Repository`.