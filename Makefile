ENV ?= dev
COMPOSE = docker compose -f docker/compose.yaml -f docker/compose.$(ENV).yaml --env-file docker/.env

.PHONY: up down build logs api web fmt check-versions

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

logs:
	$(COMPOSE) logs -f

api:
	$(COMPOSE) exec api $(CMD)

web:
	$(COMPOSE) exec web $(CMD)

fmt:
	$(COMPOSE) exec api gofmt -w .
	$(COMPOSE) exec web bunx --bun @biomejs/biome check --write .

check-versions:
	@echo "=== Docker versions ==="
	@grep _VERSION docker/.env
	@echo "=== Container Go ==="
	@$(COMPOSE) exec api go version 2>/dev/null || echo "Container api not running"
	@echo "=== Container Bun ==="
	@$(COMPOSE) exec web bun --version 2>/dev/null || echo "Container web not running"
