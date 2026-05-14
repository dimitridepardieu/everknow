-include docker/.env
APP_ENV ?= dev
COMPOSE = docker compose -f docker/compose.yaml -f docker/compose.$(APP_ENV).yaml --env-file docker/.env

.DEFAULT_GOAL := help

.PHONY: help up down restart rebuild clean build logs api web caddy postgres psql exec-api exec-web exec-caddy exec-postgres exec-psql fmt test db-reset check-versions trust-caddy-ca

help:
	@awk 'BEGIN { \
		FS = ":.*?## "; \
		printf "\n"; \
		printf "    \033[1;38;5;141m╔════════════════════════════╗\033[0m\n"; \
		printf "    \033[1;38;5;141m║     FLASHCARD ACADEMY      ║\033[0m\n"; \
		printf "    \033[1;38;5;141m╚════════════════════════════╝\033[0m\n"; \
	} \
	/^##@/ { \
		printf "\n  \033[1;38;5;117m%s\033[0m\n", substr($$0, 5); \
	} \
	/^[a-zA-Z_-]+:.*?##/ { \
		printf "    \033[38;5;222m%-16s\033[0m  \033[38;5;250m%s\033[0m\n", $$1, $$2; \
	} \
	END { printf "\n" }' $(MAKEFILE_LIST)

##@ STACK

up: ## Start the stack
	$(COMPOSE) up -d

down: ## Stop the stack
	$(COMPOSE) down

restart: ## Restart the stack (without rebuilding)
	$(COMPOSE) restart

rebuild: ## Down + build + up
	$(COMPOSE) down
	$(COMPOSE) build
	$(COMPOSE) up -d

build: ## Build container images
	$(COMPOSE) build

clean: ## Stop the stack and remove all volumes
	$(COMPOSE) down -v

logs: ## Follow container logs
	$(COMPOSE) logs -f

##@ SHELLS

api: ## Open a bash shell in the api container
	$(COMPOSE) exec api bash

web: ## Open a bash shell in the web container
	$(COMPOSE) exec web bash

caddy: ## Open a sh shell in the caddy container (Alpine — no bash)
	$(COMPOSE) exec caddy sh

postgres: ## Open a bash shell in the postgres container
	$(COMPOSE) exec postgres bash

psql: ## Open a psql session in the postgres container
	$(COMPOSE) exec postgres psql -U $(POSTGRES_USER) $(POSTGRES_DB)

##@ RUN

exec-api: ## Run a command in the api container (e.g. make exec-api CMD="go test ./...")
	$(COMPOSE) exec api $(CMD)

exec-web: ## Run a command in the web container (e.g. make exec-web CMD="bun add foo")
	$(COMPOSE) exec web $(CMD)

exec-caddy: ## Run a command in the caddy container (e.g. make exec-caddy CMD="caddy version")
	$(COMPOSE) exec caddy $(CMD)

exec-postgres: ## Run a command in the postgres container (e.g. make exec-postgres CMD="pg_dump ...")
	$(COMPOSE) exec postgres $(CMD)

exec-psql: ## Run a SQL query via psql (e.g. make exec-psql CMD="SELECT * FROM users")
	$(COMPOSE) exec postgres psql -U $(POSTGRES_USER) $(POSTGRES_DB) -c "$(CMD)"

##@ CODE

fmt: ## Format Go + TS/JS/CSS/JSON and apply ESLint auto-fixes
	$(COMPOSE) exec api gofmt -w .
	$(COMPOSE) exec web bunx --bun prettier --write .
	$(COMPOSE) exec web bunx --bun eslint . --fix

test: ## Run all tests
	$(COMPOSE) exec api go test ./...
	$(COMPOSE) exec web bunx --bun vitest run

##@ DATABASE

db-reset: ## Reset the database (drop + recreate)
	$(COMPOSE) exec postgres dropdb -U $(POSTGRES_USER) --force $(POSTGRES_DB)
	$(COMPOSE) exec postgres createdb -U $(POSTGRES_USER) $(POSTGRES_DB)
	@echo "Database $(POSTGRES_DB) reset."

##@ SETUP

trust-caddy-ca: ## Trust Caddy's dev CA in the macOS Keychain
	@if [ "$$(uname)" != "Darwin" ]; then \
		echo "Error: trust-caddy-ca supports macOS only."; \
		echo "Linux: import root.crt from the caddy container into /usr/local/share/ca-certificates/ and run update-ca-certificates"; \
		exit 1; \
	fi
	@echo "Extracting current Caddy root CA from the container..."
	@$(COMPOSE) exec caddy cat /data/caddy/pki/authorities/local/root.crt > /tmp/caddy-root.crt
	@echo "Adding to system keychain (will prompt for sudo password)..."
	@sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /tmp/caddy-root.crt
	@rm /tmp/caddy-root.crt
	@echo "Done. Restart your browser to pick up the new trusted CA."

check-versions: ## Show tool versions (.env + containers)
	@echo "=== docker/.env versions ==="
	@grep _VERSION docker/.env
	@echo "=== Container Go ==="
	@$(COMPOSE) exec api go version 2>/dev/null || echo "(api not running)"
	@echo "=== Container Bun ==="
	@$(COMPOSE) exec web bun --version 2>/dev/null || echo "(web not running)"
