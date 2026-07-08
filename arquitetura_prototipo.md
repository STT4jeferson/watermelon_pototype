# Relatório Arquitetural: Protótipo Mobile Offline-First 🍉🔑

Este documento descreve a arquitetura, as decisões técnicas e o funcionamento do protótipo de aplicativo mobile offline-first. Ele foi desenhado para atuar como um guia para a equipe técnica de engenharia, QA e produto.

---

## 1. Visão Geral

O projeto é um sistema **SaaS Multi-tenant** (várias empresas no mesmo banco isoladas logicamente), focado em coleta de dados em campo onde a conectividade é intermitente ou nula.

O sistema permite que o usuário faça login de forma segura, baixe seus dados, vá para o campo (offline), crie registros e tire fotos. Quando a conexão é reestabelecida, os dados são sincronizados com o servidor em background.

---

## 2. Stack Tecnológica (A Arquitetura)

A arquitetura foi dividida em três pilares para garantir escalabilidade, segurança corporativa e resiliência:

1. **Frontend Mobile (App)**
   - **Framework:** React Native com Expo (Development Build).
   - **Banco Local:** WatermelonDB (SQLite otimizado para concorrência e sync).
   - **Autenticação:** `expo-auth-session` (OAuth2 / OpenID Connect com PKCE).

2. **Provedor de Identidade (IdP)**
   - **Engine:** Keycloak (Docker / Quarkus).
   - **Banco de Dados (Auth):** PostgreSQL dedicado.
   - **Responsabilidade:** Gestão de senhas, roles, grupos, MFA e emissão de tokens JWT.

3. **Backend (Resource Server & Sync API)**
   - **Engine:** Node.js com Fastify (Alta performance).
   - **ORM:** Prisma.
   - **Banco de Dados (Domínio):** MySQL.
   - **Responsabilidade:** Validação do JWT, Just-In-Time Provisioning de multi-tenant e resolução de conflitos de sincronização.

---

## 3. Decisões Arquiteturais: O "Por que" de cada coisa

### 3.1. Por que WatermelonDB?
A maioria dos apps usa Redux, Zustand ou AsyncStorage para guardar estado. Porém, em cenários offline reais com milhares de registros, essas soluções travam a UI thread do React Native (o app fica lento).
**A Decisão:** O WatermelonDB usa SQLite em uma thread nativa separada (usando C++ e JSI) e trabalha sob o padrão de *Lazy Loading*. Além disso, ele possui um motor de sincronização (`sync()`) já pronto, que gerencia automaticamente o que precisa ser enviado (push) e o que precisa ser recebido (pull) baseado em *timestamps*.

### 3.2. Separação de Identidade (Keycloak) vs Banco de Dados (MySQL)
Senhas e regras de autenticação não devem viver na mesma tabela de negócios em aplicações SaaS corporativas modernas.
**A Decisão:** O Keycloak assume todo o ônus de segurança, bloqueio de força bruta e redefinição de senha. O Backend não sabe as senhas de ninguém, apenas confia na criptografia (JWKS) do Token JWT que o Keycloak assina. 

### 3.3. Multi-Tenant Dinâmico: Just-In-Time (JIT) Provisioning via Grupos
Como sincronizar o usuário que o Administrador criou no painel do Keycloak com a base MySQL do Backend sem criar *Webhooks* complexos?
**A Decisão:** Implementamos o **JIT Provisioning acoplado aos Grupos do OIDC**. 
- O Admin cria um Grupo no Keycloak (Ex: "Supermercado XYZ") e coloca o usuário lá.
- Quando o usuário loga no app, o Keycloak injeta `"groups": ["Supermercado XYZ"]` no Token.
- No primeiro *request* da vida desse usuário para o nosso Backend, o middleware Node.js lê esse grupo, **cadastra automaticamente a Empresa no MySQL**, cadastra o Usuário e libera o acesso. Automação total (Zero-touch infra).

### 3.4. Resolução do IP de LAN Automático (O Scanner de Terminal)
Uma das maiores dores em debugar apps mobile com backends locais é que o `.APK` não consegue achar o `localhost` da máquina do desenvolvedor (pois o localhost do celular é o próprio celular). Hardcodar (chumbar) IPs no `.env` exige recompilar o APK para cada testador.
**A Decisão:** Criamos um script no `make up` que lê o IP da placa de rede da máquina e imprime um **QR Code gigante no terminal**. O testador apenas abre a câmera no app mobile, lê o QR Code do terminal, e o app reconfigura todas as rotas (Keycloak e API) em tempo de execução. Portabilidade máxima.

### 3.5. Tratamento de Audience no JWT (OIDC Public Clients)
O protocolo OAuth OIDC dita que, ao logar via aplicativo nativo (Public Client), o Token gerado não recebe o nome da API como `audience` (`aud`), mas sim coloca o nome do app em um campo chamado `azp` (Authorized Party).
**A Decisão:** Foi criada uma rotina customizada no backend Fastify onde o `jsonwebtoken` ignora a flag estrita e aceita o token caso ele tenha sido gerado com o `azp` do `watermelon-mobile`. Isso evita falsos bloqueios de segurança mantendo a API trancada para tokens forjados.

### 3.6. White-labeling: Keycloak Theme
O Keycloak por padrão redireciona o usuário para uma página web da RedHat. Isso quebra a experiência imersiva do aplicativo móvel.
**A Decisão:** Criamos um tema CSS (`infra/keycloak_theme/watermelon`) que herda a base do Keycloak, mas aplica as cores nativas do Design System do App (inclusive com suporte automático a *Dark Mode* do OS), removendo headers corporativos e injetando o logotipo do app via *Pseudo-elementos SVG*. O usuário nem percebe que saiu do app.

---

## 4. Como as coisas funcionam na prática (Fluxos)

### Fluxo de Autenticação & JIT
1. O usuário clica em **"Entrar com Keycloak"**.
2. O `expo-auth-session` abre uma aba segura do sistema (*Custom Tabs*).
3. O usuário digita credenciais. O Keycloak valida e devolve um *Authorization Code*.
4. O App troca o código por *Tokens (Access e Refresh)* e salva no SQLite (Seguro).
5. O App dispara um `GET /me` pro Backend. O Node intercepta o JWT, cria a Empresa/Usuário se não existir (JIT), e devolve sucesso.
6. O App muda a navegação para a tela principal (Home).

### Fluxo Offline e Sync (WatermelonDB)
1. **Modo Avião:** O usuário cria uma Venda. O WatermelonDB gera um UUID local, salva no SQLite com a flag `sync_status = 'pending'` e guarda a foto no disco do celular.
2. **Conexão volta:** O usuário clica em "Sincronizar".
3. **Pull:** O app envia um *timestamp* para o backend: *"O que mudou desde a última vez?"*. O Backend devolve registros de outros usuários da mesma empresa. O SQLite atualiza.
4. **Push:** O app junta os registros que estavam `'pending'` e envia pro Backend em um pacotão JSON (`POST /sync/push`).
5. **Fotos:** Arquivos pesados não vão no pacote JSON principal. Eles são enviados via FormData (`POST /registros/:id/fotos`), vinculados ao ID do registro que acabou de ser criado.
6. **Conclusão:** O app marca localmente tudo como `sync_status = 'synced'`.

---

## 5. Próximos Passos (Rumo à Produção)
Para migrar esta arquitetura do ambiente local (`make up`) para a nuvem definitiva:

1. **Deploy do Keycloak:** Subir a imagem Docker do Keycloak e do Postgres em um Cloud Provider, garantindo a configuração de HTTPS com um domínio de verdade (Ex: `sso.empresa.com.br`).
2. **Cloud Storage (Fotos):** Atualmente as fotos sincronizadas são salvas no disco do Node.js. Deve-se plugar um SDK (AWS S3, Google Cloud Storage, ou Cloudflare R2) na rota do backend Fastify.
3. **Refresh Token Rotation:** Avaliar implementação de *Silent Refresh* para garantir que sessões que duram muitos dias em aparelhos offline consigam renovar a segurança do JWT de forma indolor.
4. **Migração do Realm:** Exportar o JSON de configuração do Keycloak Local (`watermelon-local`) e injetar na instância de Produção.
