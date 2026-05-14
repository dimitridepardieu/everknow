-include docker/.env
APP_ENV ?= dev
COMPOSE = docker compose -f docker/compose.yaml -f docker/compose.$(APP_ENV).yaml --env-file docker/.env

.DEFAULT_GOAL := help

.PHONY: help up down restart rebuild clean build logs api web fmt test db-reset check-versions

help: ## Show this help
	@awk 'BEGIN { \
		FS = ":.*?## "; \
		printf "\n\033[1;37mFlashcard Academy — Makefile\033[0m\n"; \
		printf "\033[2mUsage: make <target>\033[0m\n"; \
	} \
	/^##@/ { \
		printf "\n\033[1;33m%s\033[0m\n", substr($$0, 5); \
	} \
	/^[a-zA-Z_-]+:.*?##/ { \
		printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2; \
	}' $(MAKEFILE_LIST)

##@ Lifecycle

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

clean: ## Stop the stack and remove all volumes
	$(COMPOSE) down -v

##@ Build

build: ## Build container images
	$(COMPOSE) build

##@ Exec

api: ## Run a command in the api container (e.g. make api CMD="go test ./...")
	$(COMPOSE) exec api $(CMD)

web: ## Run a command in the web container (e.g. make web CMD="bun add foo")
	$(COMPOSE) exec web $(CMD)

##@ Quality

fmt: ## Format Go + TS/JS/CSS/JSON and apply ESLint auto-fixes
	$(COMPOSE) exec api gofmt -w .
	$(COMPOSE) exec web bunx --bun prettier --write .
	$(COMPOSE) exec web bunx --bun eslint . --fix

test: ## Run all tests
	$(COMPOSE) exec api go test ./...
	$(COMPOSE) exec web bunx --bun vitest run

##@ Database

db-reset: ## Reset the database (drop + recreate)
	$(COMPOSE) exec postgres dropdb -U $(POSTGRES_USER) --force $(POSTGRES_DB)
	$(COMPOSE) exec postgres createdb -U $(POSTGRES_USER) $(POSTGRES_DB)
	@echo "Database $(POSTGRES_DB) reset."

##@ Maintenance

logs: ## Follow container logs
	$(COMPOSE) logs -f

check-versions: ## Show tool versions (.env + containers)
	@echo "=== docker/.env versions ==="
	@grep _VERSION docker/.env
	@echo "=== Container Go ==="
	@$(COMPOSE) exec api go version 2>/dev/null || echo "(api not running)"
	@echo "=== Container Bun ==="
	@$(COMPOSE) exec web bun --version 2>/dev/null || echo "(web not running)"
