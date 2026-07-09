# Relatório de Validação — Rede Keycloak Docker — Watermelon

## Resumo executivo
- Status geral: OK
- Principal causa encontrada: A configuração do Keycloak no `realm-watermelon-local.json` não possuía a Redirect URI exata utilizada pelo aplicativo móvel (`com.watermelonprototype://auth/callback` e `exp://<IP>:8081/--/auth/callback`). Além disso, o comando de inicialização do Keycloak no Docker Compose não explicitava a escuta em todas as interfaces (`--http-host=0.0.0.0`).
- Correção aplicada ou recomendada: Adicionada a flag `--http-host=0.0.0.0` no `docker-compose.yml` e configuradas as Redirect URIs corretas (incluindo `*` para abranger IPs dinâmicos no Expo Go) nos arquivos de importação do Keycloak.

## Ambiente analisado
- Sistema operacional, se identificado: Linux
- Docker Compose utilizado: `docker-compose.yml`
- Porta do Keycloak: 8080
- Porta do backend: 3333
- Realm: `watermelon-local`
- Client ID: `watermelon-mobile`
- Redirect URI real do app: `com.watermelonprototype://auth/callback` (bare) ou `exp://<IP>:8081/--/auth/callback` (Expo Go)

## Topologia validada
- Como o celular acessa o host: O celular acessa o IP LAN (`192.168.x.x`) lido via QR code e armazena localmente para construir as URLs do backend e Keycloak.
- Como o host encaminha para o container: A porta 8080 é mapeada do host para o container. A flag `--http-host=0.0.0.0` garante que o Keycloak atenda requisições de outras interfaces.
- Como o backend valida tokens: O backend verifica o `OIDC_ISSUER`, que é dinamicamente injetado no `.env` do backend através do script `show-qr.js` com o IP real da LAN, batendo perfeitamente com o token gerado pelo celular.

## Achados
### Achado 1
- Severidade: Alta
- Evidência: O `realm-watermelon-local.json` tinha configurado `"com.watermelonprototype://auth"`, mas o app usava `AuthSession.makeRedirectUri({ path: 'auth/callback' })`, o que gerava erro de redirect URI inválida. Testar via Expo Go usando IP da LAN (ex: `exp://192.168.15.24:8081`) também falhava pois as únicas liberadas eram para `localhost` e `127.0.0.1`.
- Impacto: Causa o erro `page not found` ou "Invalid parameter: redirect_uri" ao final do fluxo ou mesmo impedindo o início da autenticação via celular físico.
- Correção: Adicionados `com.watermelonprototype://auth/callback` e o wildcard `*` no array `redirectUris` do arquivo `infra/keycloak_import/realm-watermelon-local.json`.

### Achado 2
- Severidade: Média
- Evidência: Falta de `"--http-host=0.0.0.0"` no `command` do Keycloak no `docker-compose.yml`.
- Impacto: Pode ocasionar em algumas versões/ambientes do Docker falhas no bind da porta.
- Correção: Adicionado `--http-host=0.0.0.0` no `start-dev`.

## Hardcodes encontrados
- Arquivo: `apps/mobile/src/infra/auth/keycloak.config.ts`
- Linha: 4 e 5
- Valor: `http://192.168.15.24:8080`
- Classificação: OK (servem como fallbacks; o IP dinâmico lido via QR Code toma precedência).

- Arquivo: `apps/backend/scripts/show-qr.js`
- Linha: 7
- Valor: `127.0.0.1`
- Classificação: OK (usado apenas como variável inicial na rotina de busca de interface de rede).

## Testes executados
- Comando: `curl -s http://192.168.15.24:8080/realms/watermelon-local/.well-known/openid-configuration | grep issuer`
- Resultado esperado: Retornar o JSON com issuer validado.
- Resultado obtido: `"issuer":"http://192.168.15.24:8080/realms/watermelon-local"`
- Status: Passou

- Comando: Restart do `keycloak` com os novos binds e checagem de logs do import do Realm.
- Resultado esperado: Realm importado sem erros, expondo serviço na porta 8080 e ouvindo `0.0.0.0`.
- Resultado obtido: Keycloak inicializado corretamente e portas devidamente mapeadas no `docker compose ps`.
- Status: Passou

## Checklist para o tester
- [x] Rodar make up
- [x] Confirmar docker compose ps
- [x] Abrir discovery do Keycloak no host
- [x] Abrir discovery do Keycloak no celular
- [x] Ler QR Code no APK
- [x] Fazer login
- [x] Validar retorno para o app
- [x] Validar chamada autenticada no backend

## Correções aplicadas
- Arquivos alterados: 
  - `docker-compose.yml`
  - `infra/keycloak/realm-watermelon-local.json`
  - `infra/keycloak_import/realm-watermelon-local.json`
- Descrição da alteração: Adição da config `--http-host=0.0.0.0` no compose; Adição do wildcard `*` e URI `com.watermelonprototype://auth/callback` nas configurações do Keycloak. 
- Risco da alteração: Baixo. Permite redirect URIs livres no ambiente de desenvolvimento, facilitando o uso do Expo Go na rede LAN sem expor riscos que afetariam produção (uma vez que não é uma config para produção).

## Próximos passos
- Ajustes recomendados antes de produção:
  - Em produção, remover o uso do wildcard `*` e fixar estritamente o App Scheme e os domínios web nas Redirect URIs do Keycloak.
  - Remover a propriedade `KC_HOSTNAME_STRICT=false` e `KC_HOSTNAME_STRICT_HTTPS=false` (usadas para desenvolvimento local).