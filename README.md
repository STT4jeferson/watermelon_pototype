# Protótipo Mobile Offline-First com WatermelonDB + Keycloak

Este é um protótipo completo de aplicativo mobile offline-first construído com **Expo (React Native), TypeScript, WatermelonDB**, acompanhado de um backend em **Fastify (Node.js), Prisma e MySQL**, e que agora conta com **Keycloak** para gestão centralizada de autenticação, usuários e tokens.

O sistema implementa o isolamento de dados por empresa e o fluxo de sincronização offline-first (`pullChanges` / `pushChanges`) com suporte a uploads de fotos.

## Requisitos

- Node.js (v18+)
- npm, yarn ou pnpm
- Docker e Docker Compose
- Android Studio / Emulador ou Dispositivo Físico configurado
- (Opcional) Expo CLI para rodar fonte `npm i -g expo-cli`

---

## Passo a Passo para Testadores

Se você recebeu este projeto para testes ou avaliação de integração, o ambiente pode ser levantado em **um único comando**.

### 1. Subindo a infraestrutura 

Na raiz do projeto (onde está o arquivo `Makefile`), abra o seu terminal e execute:

```bash
make up
```

Este comando automatiza todo o setup:
1. Copia o arquivo `.env` para o mobile e para o backend.
2. Instala as dependências Node do Backend.
3. Sobe os bancos de dados e o **Keycloak** via Docker.
4. Aguarda inicialização, roda as `migrations` (Prisma) e faz o `seed` dos usuários de teste.
5. Inicia o servidor Web (Backend) expondo a porta `3333`.

### 2. Acessos locais na máquina

- **Backend API**: `http://localhost:3333`
- **Keycloak Web Admin**: `http://localhost:8080`
  - *Login Admin:* `admin` | *Senha:* `admin`
  - *Lembrete:* Ao logar, troque o Realm de "master" para **"watermelon-local"** (no menu dropdown no canto superior esquerdo). É dentro deste Realm que a aplicação funciona.

#### Como gerenciar Usuários e Roles no Keycloak (Manager)
1. Acesse o painel Admin do Keycloak em `http://localhost:8080` com `admin`/`admin`.
2. Garanta que você está no Realm **watermelon-local**.
3. No menu lateral esquerdo, clique em **Users** para listar, buscar ou adicionar novos usuários. 
4. Ao criar um usuário, acesse a aba **Credentials** dele para definir uma senha (desmarque "Temporary" para que ele não precise trocar no primeiro login).
5. Para atribuir o usuário a uma empresa, o Backend valida os atributos customizados vinculados a ele.

#### Como acessar o Banco de Dados (MySQL) para validar o Sync
Para confirmar visualmente se o aplicativo sincronizou os dados offline com o servidor, o testador pode se conectar diretamente ao banco de dados local usando ferramentas visuais como **DBeaver**, **MySQL Workbench**, **DataGrip** ou a própria extensão de Banco de Dados do VS Code.

- **Host**: `localhost` (ou o IP da sua máquina)
- **Porta**: `3306`
- **Database**: `watermelon_db`
- **Usuário**: `watermelon_user`
- **Senha**: `watermelon_password`

*Dica de Teste:* Após fazer um cadastro offline no celular (no modo avião, por exemplo), reconecte, aperte para Sincronizar no app e, em seguida, dê um `SELECT * FROM registros;` (ou abra a tabela `registros` e `foto_registros` no seu gerenciador de banco). Os dados aparecerão no banco do backend na mesma hora.

### 3. Rodando o Aplicativo Móvel (.APK ou Código Fonte)

Se você recebeu o `.apk` compilado:
1. Instale o APK no seu aparelho Android ou emulador.
2. Certifique-se que o celular/emulador e a máquina rodando o `make up` estão **na mesma rede Wi-Fi/LAN**.
3. Descubra o IP da sua máquina rodando o Docker. (No Windows abra o `cmd` e digite `ipconfig`. No Linux/Mac digite `hostname -I` ou `ifconfig`). O IP geralmente começa com `192.168...` ou `10.0...`.
4. Abra o App no celular. Na tela de Login, **toque na Engrenagem no canto superior direito**.
5. Digite o IP da sua máquina e clique em "Salvar Configuração".
6. Clique em **Entrar com Keycloak**. O App já saberá onde localizar os seus containers.

*Se quiser rodar a partir do código fonte (necessário prebuild do WatermelonDB):*
```bash
cd apps/mobile
npm install
npx expo prebuild --clean
npx expo run:android
```

---

## Como testar Autenticação e Offline-first

### 1. Usuários de Teste

O script `make up` importou os seguintes usuários no Keycloak e no banco de dados da aplicação:

- **Usuário A (Empresa A):** `joao@teste.com` / Senha: `123`
- **Usuário B (Empresa B):** `maria@teste.com` / Senha: `123`

#### Como criar Novas Empresas e Novos Usuários
Para usar o isolamento multi-tenant dinâmico do projeto, você só precisa usar o painel do Keycloak:
1. Abra `http://localhost:8080` (admin/admin).
2. Vá no menu esquerdo e clique em **Groups**.
3. Crie um grupo novo (Ex: `Supermercado XYZ`).
4. Vá no menu **Users** e crie um novo usuário.
5. Na aba *Credentials* do usuário novo, cadastre uma senha (desmarcando "Temporary").
6. Na aba *Groups* do usuário novo, clique para colocá-lo dentro do grupo `Supermercado XYZ`.

**A Mágica:** Na próxima vez que esse usuário logar no aplicativo de celular, o backend interceptará esse novo Grupo, criará automaticamente a empresa `Supermercado XYZ` no banco de dados MySQL e o vinculará. Totalmente *plug-and-play*!

### 2. Testando Login e Multi-tenant
1. Clique em **Entrar com Keycloak** no aplicativo móvel.
2. Faça o login utilizando o **Usuário A** no navegador interno que será aberto.
3. Após ser redirecionado de volta, crie um registro e salve.
4. Vá em `Perfil` > `Sair`.
5. Faça login com o **Usuário B**. Confirme que você não tem acesso aos registros do Usuário A. O Backend resolve isso internamente validando o JWT (`keycloak_id`) e injetando o filtro de Empresa no WatermelonDB, mantendo um isolamento seguro de multilocatário.

### 3. Testando comportamento Offline
1. Logado como Usuário A, desligue a internet / coloque o celular no modo avião.
2. Crie registros com Fotos. A criação prosseguirá perfeitamente porque o SQLite/WatermelonDB salva localmente com `syncStatus='pending'` e as fotos ficam salvas fisicamente na pasta do celular.
3. Ligue a internet novamente.
4. Na Home do app, clique no botão redondo de Sincronizar. O app chamará os endpoints seguros usando seu AccessToken emitido pelo Keycloak.
5. Verifique o banco `MySQL` ou a tela e comprove que o seu dado offline subiu com segurança.

---

## Troubleshooting de redirect OIDC (Keycloak)

| Sintoma | Causa provável | Correção |
|---|---|---|
| `page not found` após login | URL errada no Realm do Keycloak | O RedirectURI deve constar no Realm do Keycloak (que já importamos via docker-compose). |
| App não volta após login | `scheme` não registrado ou app não rebuildado | Se recompilar, rodar `npx expo prebuild --clean` novamente. |
| Erro de carregamento/Login falha | App está tentando buscar o `localhost` | No .APK ou app, sempre use o botão da Engrenagem para indicar o IP da rede local da máquina que está rodando o `make up`. |
| Backend rejeita token | `audience invalid` | Configuramos a flag azp e checagem tolerante no verificador JWT para suportar clients nativos PKCE. |

---

## Como parar a aplicação

No terminal onde executou `make up`, pare a execução do servidor (`Ctrl+C`).
Se quiser desligar o Docker e os bancos de dados:

```bash
make down
```

Se quiser reiniciar a estrutura do zero perdendo todos os dados inseridos (Destrutivo):

```bash
make clean
```
