.PHONY: setup up down clean

setup:
	@echo "==> 1. Configurando variáveis de ambiente..."
	@if [ ! -f .env ]; then cp .env.example .env; echo "Criado .env na raiz"; fi
	@if [ ! -f apps/backend/.env ]; then \
		echo "DATABASE_URL=\"mysql://watermelon_user:watermelon_password@localhost:3306/watermelon_db\"\nJWT_SECRET=\"supersecret123\"\nOIDC_ISSUER=\"http://127.0.0.1:8080/realms/watermelon-local\"\nOIDC_JWKS_URI=\"http://127.0.0.1:8080/realms/watermelon-local/protocol/openid-connect/certs\"\nOIDC_AUDIENCE=\"watermelon-backend\"" > apps/backend/.env; \
		echo "Criado apps/backend/.env"; \
	fi
	@echo "==> 2. Instalando dependências do backend..."
	@cd apps/backend && npm install

up: setup
	@echo "==> 3. Descobrindo IP da rede e atualizando .env local..."
	@cd apps/backend && node scripts/show-qr.js > /dev/null 2>&1
	@echo "==> 4. Subindo infraestrutura via Docker (Keycloak, MySQL, Postgres)..."
	docker compose up -d
	@echo "==> 5. Aguardando os bancos de dados iniciarem (15s)..."
	@sleep 15
	@echo "==> 6. Executando Migrations e Seed no Backend..."
	@cd apps/backend && npx prisma db push --accept-data-loss && npx tsx prisma/seed.ts
	@echo "==> 7. Exibindo QR Code de Conexão..."
	@cd apps/backend && node scripts/show-qr.js
	@echo "==> 8. Iniciando o Backend na porta 3333..."
	@cd apps/backend && npm run dev

down:
	@echo "==> Derrubando a infraestrutura..."
	docker compose down

clean: down
	@echo "==> Limpando volumes (ATENÇÃO: apaga os dados do banco local)..."
	docker compose down -v
