-include docker/.env
APP_ENV ?= dev
COMPOSE = docker compose -f docker/compose.yaml -f docker/compose.$(APP_ENV).yaml --env-file docker/.env

.DEFAULT_GOAL := help

.PHONY: help up down restart rebuild clean build logs logs-api logs-web logs-caddy logs-postgres api web caddy postgres psql exec-api exec-web exec-caddy exec-postgres exec-psql fmt test db-reset db-seed db-fresh check-versions trust-caddy-ca

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
		if (substr($$2, 1, 2) == "! ") { \
			desc = substr($$2, 3); \
			printf "    \033[38;5;222m%-16s\033[0m  \033[38;5;250m%s\033[0m \033[1;38;5;203m[!]\033[0m\n", $$1, desc; \
		} else { \
			printf "    \033[38;5;222m%-16s\033[0m  \033[38;5;250m%s\033[0m\n", $$1, $$2; \
		} \
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

clean: ## ! Stop the stack and remove all volumes
	@if [ "$(CONFIRM)" != "yes" ]; then \
		read -p "Remove all containers and DELETE all data volumes? Type 'yes' to confirm: " REPLY; \
		[ "$$REPLY" = "yes" ] || { echo "Aborted."; exit 1; }; \
	fi
	$(COMPOSE) down -v

##@ LOGS

logs: ## Follow all containers logs
	$(COMPOSE) logs -f

logs-api: ## Follow api container logs only
	$(COMPOSE) logs -f api

logs-web: ## Follow web container logs only
	$(COMPOSE) logs -f web

logs-caddy: ## Follow caddy container logs only
	$(COMPOSE) logs -f caddy

logs-postgres: ## Follow postgres container logs only
	$(COMPOSE) logs -f postgres

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

db-reset: ## ! Reset the database (drop + recreate) — DEV ONLY
	@if [ "$(APP_ENV)" != "dev" ]; then \
		echo "Refused: db-reset is dev-only (APP_ENV=$(APP_ENV))."; exit 1; \
	fi
	@if [ "$(CONFIRM)" != "yes" ]; then \
		read -p "Drop and recreate database '$(POSTGRES_DB)'? Type 'yes' to confirm: " REPLY; \
		[ "$$REPLY" = "yes" ] || { echo "Aborted."; exit 1; }; \
	fi
	$(COMPOSE) exec postgres dropdb -U $(POSTGRES_USER) --force $(POSTGRES_DB)
	$(COMPOSE) exec postgres createdb -U $(POSTGRES_USER) $(POSTGRES_DB)
	@echo "Database $(POSTGRES_DB) reset."

db-seed: ## Seed dev database with sample users (idempotent) — DEV ONLY
	@if [ "$(APP_ENV)" != "dev" ]; then \
		echo "Refused: db-seed is dev-only (APP_ENV=$(APP_ENV))."; exit 1; \
	fi
	@cat api/internal/db/seeds/dev.sql | $(COMPOSE) exec -T postgres psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) -v ON_ERROR_STOP=1
	@echo "Database seeded."

db-fresh: ## ! Reset + auto-migrate + seed in one shot — DEV ONLY
	@if [ "$(APP_ENV)" != "dev" ]; then \
		echo "Refused: db-fresh is dev-only (APP_ENV=$(APP_ENV))."; exit 1; \
	fi
	@$(MAKE) db-reset CONFIRM=$(CONFIRM)
	@echo "Restarting api to re-run migrations..."
	@$(COMPOSE) restart api >/dev/null
	@sleep 3
	@$(MAKE) db-seed

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
