.PHONY: setup up dev up-d down build ensure-env npm-install composer-install test test-coverage test-js test-js-coverage lint type-check logs shell tinker migrate fresh clean

# Use Doppler to inject environment variables when this directory is linked
# to a Doppler project/config (`doppler setup`). Third parties without
# Doppler access fall back to a plain `.env` file instead (see ensure-env
# below) — `docker compose` reads that file automatically for ${VAR}
# interpolation in docker-compose.yml, no extra flag needed.
DOPPLER_LINKED := $(shell command -v doppler >/dev/null 2>&1 && doppler configure get project --plain 2>/dev/null)

ifneq ($(strip $(DOPPLER_LINKED)),)
COMPOSE := doppler run -- docker compose
else
COMPOSE := docker compose
endif


# Make sure a usable .env exists before docker compose reads it for variable
# interpolation. No-op when Doppler is linked — Doppler is the source of
# truth then and a stray .env must not shadow it.
ensure-env:
ifeq ($(strip $(DOPPLER_LINKED)),)
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "  Created .env from .env.example (no Doppler link found)."; \
	fi
	@if ! grep -q '^APP_KEY=base64:' .env; then \
		KEY=$$(head -c 32 /dev/urandom | base64); \
		sed -i.bak "s#^APP_KEY=.*#APP_KEY=base64:$$KEY#" .env && rm -f .env.bak; \
		echo "  Generated a fresh APP_KEY in .env."; \
	fi
endif


# Build images and start the full stack (app + vite) in the background.

setup: ensure-env
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d
	@echo ""
	@echo "  Orbit is running — open the app in your browser:"
	@echo ""
	@echo "    App (Laravel):   http://localhost:8000"
	@echo "    Vite (assets):   http://localhost:5173"
	@echo ""


# Start the stack in the foreground (Ctrl+C to stop).

up dev: ensure-env
	@echo ""
	@echo "  Orbit is starting — open the app in your browser:"
	@echo ""
	@echo "    App (Laravel):   http://localhost:8000"
	@echo "    Vite (assets):   http://localhost:5173"
	@echo ""
	$(COMPOSE) up


# Start the stack detached.

up-d: ensure-env
	$(COMPOSE) up -d
	@echo ""
	@echo "  Orbit is running (detached) — open the app in your browser:"
	@echo ""
	@echo "    App (Laravel):   http://localhost:8000"
	@echo "    Vite (assets):   http://localhost:5173"
	@echo ""


# Stop the stack.

down:
	$(COMPOSE) down

# Start the monitoring stack detached.

up-monitoring:
	$(COMPOSE) --profile monitoring up -d uptime-kuma

# Stop the monitoring stack.

down-monitoring:
	$(COMPOSE) --profile monitoring stop uptime-kuma

# Tail logs from the monitoring stack.

logs-monitoring:
	$(COMPOSE) --profile monitoring logs -f uptime-kuma

# (Re)build the images.

build: ensure-env
	$(COMPOSE) build


# Run this after adding/updating/removing an npm package.

npm-install: ensure-env
	$(COMPOSE) build vite
	$(COMPOSE) up -d --renew-anon-volumes vite


# Run this after adding/updating/removing a composer package.

composer-install: ensure-env
	$(COMPOSE) build app
	$(COMPOSE) up -d --renew-anon-volumes app


# Run the PHP (Pest) test suite.

test: ensure-env
	$(COMPOSE) run --rm app php artisan test


# Run the PHP test suite with the code coverage gate.

test-coverage: ensure-env
	$(COMPOSE) run --rm app composer test-coverage


# Run the frontend (Vitest) test suite once.

test-js: ensure-env
	$(COMPOSE) run --rm vite npm run test -- --run


# Run the frontend test suite with the code coverage gate.

test-js-coverage: ensure-env
	$(COMPOSE) run --rm vite npm run test\:coverage


# Lint the frontend.

lint: ensure-env
	$(COMPOSE) run --rm vite npm run lint


# Type-check the frontend.

type-check: ensure-env
	$(COMPOSE) run --rm vite npx tsc --noEmit


# Tail logs from all services.

logs:
	$(COMPOSE) logs -f


# Open a shell in the app container.

shell:
	$(COMPOSE) exec app sh


# Laravel tinker REPL.

tinker:
	$(COMPOSE) exec app php artisan tinker


# Run migrations.

migrate:
	$(COMPOSE) exec app php artisan migrate


# Drop everything and re-migrate with seed data.

fresh:
	$(COMPOSE) exec app php artisan migrate\:fresh --seed


# Stop the stack and remove volumes.

clean:
	$(COMPOSE) down -v
