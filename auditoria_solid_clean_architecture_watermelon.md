# Auditoria Sênior de SOLID + Clean Architecture — Protótipo Watermelon

## Objetivo

Você é o Codex atuando como **arquiteto sênior de software**. Sua missão é analisar o protótipo Watermelon e garantir que a aplicação esteja seguindo corretamente os princípios de **SOLID**, **Clean Architecture**, **Clean Code**, **TypeScript forte**, **offline-first** e uma organização madura para evolução em produção.

O projeto é um protótipo composto por:

- Aplicativo mobile em **React Native / Expo / TypeScript**.
- Banco local com **WatermelonDB**.
- Sincronização offline-first com backend.
- Backend com API REST persistindo dados em **MySQL**.
- Autenticação com **Keycloak** rodando em container Docker.
- Execução local via Docker/Makefile para validação.
- Testes em celular físico usando APK.

A análise deve ser feita com mentalidade de produção, pensando em escalabilidade, manutenibilidade, testabilidade e separação real de responsabilidades.

---

## Diretriz principal

Não faça apenas uma revisão superficial de pastas. Avalie se a arquitetura realmente impede acoplamento indevido, duplicação, vazamento de detalhes de infraestrutura e regras de negócio espalhadas em componentes, services genéricos ou controllers.

A aplicação deve ser avaliada como se fosse evoluir para um produto real.

---

## Escopo da análise

Analise todo o repositório, incluindo:

- Aplicativo mobile.
- Backend/API.
- Configuração Docker.
- Configuração de autenticação Keycloak.
- Scripts de execução local.
- Estrutura de banco local WatermelonDB.
- Fluxo de sincronização local/remoto.
- Camada de domínio.
- Camada de aplicação/use cases.
- Camada de infraestrutura.
- Camada de apresentação/UI.
- Testes existentes.
- README e documentação de execução.

---

## O que você deve validar

### 1. Organização geral do projeto

Verifique se existe uma separação clara entre frontend, backend, infraestrutura e documentação.

Avalie se a estrutura atual permite entender rapidamente:

- Onde ficam as regras de negócio.
- Onde ficam os casos de uso.
- Onde ficam os contratos/interfaces.
- Onde ficam as implementações concretas.
- Onde ficam DTOs, mappers e adapters.
- Onde ficam integrações externas.
- Onde ficam models do WatermelonDB.
- Onde ficam schemas e migrations.
- Onde ficam controllers, routes e middlewares do backend.

Aponte qualquer problema como:

- Pastas genéricas demais, como `services`, `utils`, `helpers` ou `common` acumulando regras críticas.
- Arquivos muito grandes.
- Componentes React com regra de negócio.
- Controllers com regra de negócio.
- Use cases dependendo diretamente de frameworks.
- Infraestrutura vazando para domínio.
- Código duplicado entre mobile e backend.
- Nomes ambíguos ou inconsistentes.

---

### 2. Clean Architecture

Valide se a dependência entre camadas está correta.

A direção ideal de dependência deve ser:

```txt
Presentation/UI
    ↓
Application / Use Cases
    ↓
Domain
    ↑
Infrastructure implements contracts from inner layers
```

A camada de domínio não pode depender de:

- React.
- React Native.
- Expo.
- WatermelonDB.
- Axios/fetch.
- Express/Fastify/Nest ou qualquer framework web.
- MySQL client/ORM.
- Keycloak SDK.
- AsyncStorage/SecureStore.
- Variáveis de ambiente.
- Implementações concretas de API.

Valide se:

- Entidades de domínio são independentes de frameworks.
- Use cases orquestram fluxo, mas não sabem detalhes de UI ou banco.
- Repositories são contratos nas camadas internas e implementações na infraestrutura.
- DTOs externos não são usados como entidades de domínio.
- Models do WatermelonDB não são tratados como entidades de domínio.
- Responses da API não vazam diretamente para tela.
- Controllers/backend não acessam banco diretamente quando deveria haver use case.
- O backend também possui separação entre controller, application, domain e infra.

Se encontrar violação, proponha uma refatoração objetiva.

---

### 3. SOLID

Avalie cada princípio na prática.

#### S — Single Responsibility Principle

Procure arquivos/classes/funções que acumulam responsabilidades, por exemplo:

- Tela que valida formulário, chama API, salva banco local, navega e trata regra de negócio.
- Service que autentica, sincroniza, persiste, transforma DTO e controla estado.
- Repository que faz regra de negócio.
- Controller que valida regra de domínio.
- Hook React com lógica de sincronização complexa.

Para cada caso, diga:

- Qual responsabilidade está misturada.
- Por que isso é problema.
- Como separar.
- Qual seria a nova estrutura recomendada.

#### O — Open/Closed Principle

Verifique se novas funcionalidades exigiriam alterar código existente em muitos pontos.

Exemplos a analisar:

- Novos tipos de entidade sincronizável.
- Novas regras de autenticação.
- Novos endpoints.
- Novos providers de storage.
- Novas estratégias de resolução de conflito offline.
- Novos campos obrigatórios nos formulários.

Aponte pontos onde o design deveria usar abstração, estratégia, factory ou composição.

#### L — Liskov Substitution Principle

Valide se implementações de interfaces realmente respeitam os contratos.

Exemplos:

- Repositories concretos retornando dados diferentes do contrato.
- Métodos que lançam exceções inesperadas não documentadas.
- Implementações mock/fake incompatíveis com implementação real.
- Tipos opcionais sendo usados onde o contrato exige valor obrigatório.

#### I — Interface Segregation Principle

Procure interfaces grandes demais ou genéricas demais.

Exemplos ruins:

```ts
interface UserService {
  login(): Promise<void>;
  logout(): Promise<void>;
  sync(): Promise<void>;
  saveLocal(): Promise<void>;
  upload(): Promise<void>;
  refreshToken(): Promise<void>;
}
```

Sugira separar contratos por capacidade real:

- `AuthGateway`
- `TokenStorage`
- `UserRepository`
- `SyncQueueRepository`
- `RemoteUserDataSource`
- `LocalUserDataSource`

#### D — Dependency Inversion Principle

Valide se use cases dependem de contratos, não de implementações.

Procure violações como:

- `new AxiosHttpClient()` dentro de use case.
- `database.get()` do WatermelonDB dentro da camada application/domain.
- `KeycloakService` sendo usado diretamente em tela.
- `MySQLConnection` sendo usado em controller.
- Import direto de SDK externo em camada interna.

Sugira como aplicar inversão de dependência com composição no entrypoint da aplicação.

---

### 4. Arquitetura do mobile

Analise especialmente o app React Native.

Valide se:

- Telas são finas e focadas em renderização/eventos.
- Hooks não viraram camada de negócio pesada.
- Estado global não carrega regra de domínio indevida.
- Formulários possuem validação isolada.
- Navegação não contém regra de negócio.
- API clients estão isolados.
- Persistência local está isolada.
- Models WatermelonDB não vazam para componentes.
- Existe camada de mappers entre WatermelonDB, API e domínio.
- Erros são normalizados antes de chegar na UI.
- Loading/error/success states são previsíveis.
- O fluxo offline-first não depende da tela estar aberta.

Verifique se existe algo próximo desta separação:

```txt
src/
  app/ ou routes/              # Expo Router / navegação
  presentation/                # telas, componentes, hooks de apresentação
  application/                 # use cases
  domain/                      # entidades, value objects, regras puras, contratos
  infrastructure/              # API, WatermelonDB, Keycloak, storage, sync engine
  shared/                      # erros, result, logger, tipos utilitários realmente compartilhados
```

Não force essa estrutura exata se o projeto já usa outra organização consistente. O importante é validar a direção das dependências e a clareza das responsabilidades.

---

### 5. Arquitetura do backend

Analise o backend com o mesmo rigor.

Valide se:

- Rotas/controllers são finos.
- Controllers não acessam banco diretamente.
- Casos de uso concentram orquestração.
- Regras de negócio ficam no domínio.
- Infraestrutura MySQL/ORM está isolada.
- DTOs de request/response não são entidades de domínio.
- Existe tratamento centralizado de erros.
- Existe validação de entrada.
- Existe padronização de response.
- Existe separação entre autenticação/autorização e regra de negócio.
- Integração com Keycloak não está espalhada.
- Tokens JWT são validados em camada apropriada.
- Roles/scopes/grupos não estão hardcoded de forma frágil.

Procure sinais de baixa maturidade:

- SQL direto espalhado por controllers.
- Services genéricos com muitas responsabilidades.
- Ausência de transações em operações críticas.
- Ausência de paginação em listagens.
- Ausência de idempotência em endpoints de sync.
- Falta de versionamento de API.
- Falta de logs estruturados.
- Falta de correlação de request.

---

### 6. Offline-first e sincronização

Como o projeto usa WatermelonDB, avalie profundamente o fluxo offline-first.

Verifique se:

- O app salva localmente antes de depender do backend quando aplicável.
- Existe fila de sincronização ou controle equivalente.
- Existem timestamps confiáveis para controle incremental.
- Existe controle de criação, alteração e exclusão local.
- Existe estratégia clara para conflito.
- Existe distinção entre estado local, estado pendente e estado sincronizado.
- Falhas de rede não corrompem o banco local.
- O usuário não perde dados por falha de sync.
- Operações de sync são idempotentes.
- O backend aceita reenvio seguro.
- O backend consegue responder mudanças desde o último pull.
- A aplicação não usa entidade remota diretamente como model local.

Aponte riscos como:

- Sync acoplado à UI.
- Sync sem retry/backoff.
- Sync sem lock contra execuções concorrentes.
- Sync sem controle de versão/schema.
- Sync sem logs mínimos.
- Sync sem tratamento de erro parcial.
- `lastPulledAt` inseguro ou mal persistido.
- Exclusões não sincronizadas corretamente.
- Conflitos silenciosos sobrescrevendo dados.

Sugira melhorias de arquitetura para produção.

---

### 7. Autenticação e Keycloak

Analise se a integração com Keycloak está bem isolada.

Valide se:

- A UI não conhece detalhes internos do Keycloak.
- Existe gateway/provider de autenticação.
- Tokens são armazenados de forma segura.
- Refresh token possui fluxo claro.
- Logout limpa estado local sensível.
- Erros de autenticação são padronizados.
- Configuração de URL, realm e client não está hardcoded.
- O backend valida JWT corretamente.
- Roles/scopes são tratados por política ou guard/middleware.
- O app lida corretamente com expiração de sessão.
- A camada de domínio não depende de Keycloak.

Sugira uma estrutura como:

```txt
domain/auth/
  AuthSession.ts
  AuthRepository.ts

application/auth/
  LoginUseCase.ts
  LogoutUseCase.ts
  RefreshSessionUseCase.ts
  GetCurrentSessionUseCase.ts

infrastructure/auth/
  KeycloakAuthProvider.ts
  SecureTokenStorage.ts
  AuthHttpInterceptor.ts
```

Adapte à estrutura real do projeto.

---

### 8. Tipagem, erros e contratos

Valide maturidade TypeScript.

Procure:

- Uso excessivo de `any`.
- Tipos duplicados.
- Tipos implícitos perigosos.
- DTOs misturados com entidades.
- Falta de `strict`.
- Casts forçados com `as` sem justificativa.
- Retornos inconsistentes.
- Falta de discriminated unions para estados.
- Falta de tipos para erros esperados.

Recomende padrões como:

```ts
type Result<T, E> =
  | { ok: true; data: T }
  | { ok: false; error: E };
```

Ou outro padrão já utilizado no projeto, desde que consistente.

Avalie se erros são classificados como:

- Erro de validação.
- Erro de autenticação.
- Erro de autorização.
- Erro de rede.
- Erro de sync.
- Erro de conflito.
- Erro inesperado.

---

### 9. Testabilidade

Avalie se a arquitetura permite testes reais.

Verifique se existem ou deveriam existir:

- Testes unitários de domínio.
- Testes unitários de use cases.
- Testes de repositories com fake/in-memory.
- Testes de mappers.
- Testes de sync.
- Testes de autenticação mockada.
- Testes de controllers/backend.
- Testes de contrato da API.
- Testes de integração com banco.

Aponte onde o acoplamento atual dificulta testes.

Para cada problema, sugira como quebrar dependências.

---

### 10. Qualidade de código e manutenibilidade

Procure:

- Arquivos com responsabilidade demais.
- Código duplicado.
- Nomes inconsistentes.
- Funções longas.
- Componentes longos.
- Services com muitas dependências.
- Estado global excessivo.
- Uso indevido de singletons.
- Logs com dados sensíveis.
- Comentários explicando código ruim em vez de simplificar o código.
- Falta de padrão de imports.
- Falta de barrel exports ou excesso deles.
- Falta de aliases claros.
- Falta de lint/prettier/typecheck/test no pipeline local.

---

## Tarefas que você deve executar

### Fase 1 — Mapeamento

1. Leia a árvore do projeto.
2. Identifique as tecnologias reais usadas no mobile e no backend.
3. Identifique a estrutura de pastas.
4. Identifique os principais fluxos:
   - Login.
   - Refresh token/logout.
   - CRUD obrigatório do protótipo.
   - Persistência local com WatermelonDB.
   - Pull/push sync.
   - Comunicação com backend.
   - Validação JWT no backend.
5. Liste os arquivos mais críticos para arquitetura.

### Fase 2 — Auditoria SOLID + Clean Architecture

1. Verifique a direção das dependências.
2. Verifique responsabilidades por camada.
3. Verifique se domínio está puro.
4. Verifique se use cases estão bem definidos.
5. Verifique se infra implementa contratos.
6. Verifique se UI é fina.
7. Verifique se backend segue a mesma maturidade.
8. Aponte violações com arquivo, trecho e motivo.

### Fase 3 — Auditoria offline-first

1. Analise schema WatermelonDB.
2. Analise migrations.
3. Analise models.
4. Analise sync pull/push.
5. Analise fila/retry/conflito/idempotência.
6. Analise risco de perda de dados.
7. Proponha melhorias para produção.

### Fase 4 — Auditoria de autenticação

1. Analise integração Keycloak no mobile.
2. Analise validação JWT no backend.
3. Analise armazenamento de tokens.
4. Analise fluxo de refresh/logout.
5. Analise configuração via ambiente.
6. Aponte riscos e correções.

### Fase 5 — Proposta de refatoração

Monte um plano de refatoração incremental.

O plano deve ser dividido em:

- Correções críticas.
- Melhorias importantes.
- Melhorias desejáveis.
- Dívidas técnicas aceitáveis para protótipo.

Não proponha uma reescrita completa sem necessidade. Prefira refatorações incrementais e seguras.

### Fase 6 — Implementação opcional

Se encontrar problemas simples e de baixo risco, pode aplicar correções diretamente.

Mas antes de alterar qualquer fluxo sensível, siga esta regra:

- Primeiro gere o diagnóstico.
- Depois proponha a alteração.
- Só implemente se a alteração for claramente segura e localizada.

Não quebre o funcionamento atual do protótipo.

---

## Critérios de aceite da arquitetura

Considere a arquitetura adequada apenas se ela atender aos pontos abaixo.

### Mobile

- UI sem regra de negócio complexa.
- Use cases isolados.
- Domínio puro.
- WatermelonDB isolado na infraestrutura.
- API client isolado na infraestrutura.
- Keycloak isolado em provider/gateway.
- DTOs mapeados para domínio.
- Entidades de domínio não dependem de models locais/remotos.
- Sync offline-first com fluxo rastreável.
- Erros normalizados.
- Testes possíveis sem subir app real.

### Backend

- Controllers finos.
- Use cases claros.
- Domínio independente de framework e banco.
- MySQL isolado na infra.
- Autenticação/autorização em middleware/guard/policy.
- DTOs separados de entidades.
- Tratamento de erros padronizado.
- Endpoints de sync idempotentes.
- Validação de entrada.
- Testes possíveis sem subir banco real para regra de negócio.

### Projeto geral

- Configuração por ambiente.
- Baixo acoplamento.
- Alta coesão.
- Tipagem forte.
- Padrões consistentes.
- Documentação mínima para execução.
- Caminho claro para evolução em produção.

---

## Formato obrigatório da resposta final

Ao final, gere um relatório em Markdown com esta estrutura:

```md
# Relatório de Auditoria — SOLID + Clean Architecture

## 1. Resumo executivo

Resumo curto dizendo se a aplicação está madura, parcialmente madura ou imatura arquiteturalmente.

## 2. Stack identificada

- Mobile:
- Backend:
- Banco local:
- Banco remoto:
- Auth:
- Docker:

## 3. Estrutura atual do projeto

Explique como o projeto está organizado hoje.

## 4. Pontos positivos encontrados

Liste o que já está bem implementado.

## 5. Violações de Clean Architecture

| Severidade | Arquivo | Problema | Impacto | Correção recomendada |
|---|---|---|---|---|

## 6. Violações de SOLID

| Princípio | Severidade | Arquivo | Problema | Correção recomendada |
|---|---|---|---|---|

## 7. Análise do mobile

Inclua riscos e recomendações específicas para React Native, WatermelonDB, UI, hooks, estado e sync.

## 8. Análise do backend

Inclua riscos e recomendações específicas para API, MySQL, controllers, use cases, auth e sync.

## 9. Análise offline-first

Explique os riscos de perda de dados, conflito, retry, idempotência e concorrência.

## 10. Análise da autenticação Keycloak

Explique acoplamentos, riscos e melhorias.

## 11. Plano de refatoração incremental

### Crítico

### Importante

### Desejável

## 12. Sugestão de estrutura-alvo

Mostre uma estrutura de pastas recomendada para mobile e backend, adaptada ao projeto real.

## 13. Checklist de aceite para produção

Checklist objetivo para validar antes de considerar a arquitetura pronta.

## 14. Alterações aplicadas

Liste exatamente quais arquivos foram alterados, caso tenha feito mudanças.

## 15. Próximos passos

Lista objetiva do que deve ser feito depois.
```

---

## Regras importantes

- Não assuma que a arquitetura está correta apenas porque as pastas têm nomes bonitos.
- Não misture entidade de domínio com model de banco.
- Não misture DTO de API com entidade de domínio.
- Não deixe UI chamar infra diretamente se houver regra de negócio envolvida.
- Não deixe controller chamar banco diretamente em fluxo com regra de negócio.
- Não use `any` como solução rápida.
- Não crie abstrações artificiais sem benefício real.
- Não proponha overengineering para o protótipo.
- Priorize clareza, testabilidade e evolução segura.
- Seja objetivo, mas rigoroso.
- Sempre que apontar um problema, indique impacto e correção.
- Se fizer alteração no código, mantenha compatibilidade com o fluxo atual.

---

## Resultado esperado

Ao final da execução, queremos saber com clareza:

1. Se a aplicação está ou não seguindo SOLID.
2. Se a aplicação está ou não seguindo Clean Architecture.
3. Onde existem violações concretas.
4. Quais riscos essas violações trazem para produção.
5. Como corrigir sem reescrever tudo.
6. Qual estrutura-alvo devemos perseguir.
7. Quais testes garantem que a arquitetura continua saudável.

A análise deve ter profundidade de engenharia sênior e deve preparar o protótipo Watermelon para evoluir com qualidade real.
