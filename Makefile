.PHONY: up down logs test lint

up: ## Build and start the API (:8000) and web app (:8080)
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f backend

test: ## Backend lint + tests in Docker, then frontend checks
	docker compose run --rm --build backend-tests
	cd frontend && npm ci && npm run lint && npm run typecheck && npm test
