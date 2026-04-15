-include docker/.env
APP_ENV ?= dev
COMPOSE = docker compose -f docker/compose.yaml -f docker/compose.$(APP_ENV).yaml --env-file docker/.env

.PHONY: up down restart rebuild clean build logs api web fmt test db-reset check-versions

up: ## Start the stack
	$(COMPOSE) up -d

down: ## Stop the stack
	$(COMPOSE) down

restart: ## Restart the stack (without rebuilding)
	$(COMPOSE) restart

rebuild: ## Rebuild and restart the stack
	$(COMPOSE) down
	$(COMPOSE) build
	$(COMPOSE) up -d

clean: ## Stop the stack and remove all volumes
	$(COMPOSE) down -v

build: ## Build container images
	$(COMPOSE) build

logs: ## Follow container logs
	$(COMPOSE) logs -f

api: ## Run a command in the api container (e.g. make api CMD="go test ./...")
	$(COMPOSE) exec api $(CMD)

web: ## Run a command in the web container (e.g. make web CMD="bun add foo")
	$(COMPOSE) exec web $(CMD)

fmt: ## Format code (Go + TypeScript/JS/CSS/JSON)
	$(COMPOSE) exec api gofmt -w .
	$(COMPOSE) exec web bunx --bun @biomejs/biome check --write .

test: ## Run all tests
	$(COMPOSE) exec api go test ./...
	$(COMPOSE) exec web bunx --bun vitest run

db-reset: ## Reset the database (drop + recreate)
	$(COMPOSE) exec postgres dropdb -U $(POSTGRES_USER) --force $(POSTGRES_DB)
	$(COMPOSE) exec postgres createdb -U $(POSTGRES_USER) $(POSTGRES_DB)
	@echo "Database $(POSTGRES_DB) reset."

check-versions: ## Show tool versions (Docker .env + containers)
	@echo "=== Docker versions ==="
	@grep _VERSION docker/.env
	@echo "=== Container Go ==="
	@$(COMPOSE) exec api go version 2>/dev/null || echo "Container api not running"
	@echo "=== Container Bun ==="
	@$(COMPOSE) exec web bun --version 2>/dev/null || echo "Container web not running"
