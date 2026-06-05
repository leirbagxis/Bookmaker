BINARY      ?= backend/bin/superbet
FRONTEND_DIR ?= frontend
BACKEND_DIR  ?= backend
PORT         ?= 8080
DEV_PORT     ?= 5173
STATIC_DIR   ?= $(CURDIR)/$(FRONTEND_DIR)/dist

.DEFAULT_GOAL := help

.PHONY: help dev run run-go build build-frontend build-backend deps clean

help: ## Mostra esta ajuda com os alvos disponíveis
	@awk 'BEGIN {FS = ":.*?## "; printf "\033[36m%-18s\033[0m %s\n", "alvo", "descrição"} \
		/^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}' $(firstword $(MAKEFILE_LIST))

deps: ## Instala dependências (go mod download e npm install)
	cd $(BACKEND_DIR) && go mod download
	cd $(FRONTEND_DIR) && npm install

build-frontend: ## Faz build do frontend (gera frontend/dist)
	cd $(FRONTEND_DIR) && npm run build

build-backend: ## Faz build do binário Go em backend/bin/superbet
	mkdir -p $(BACKEND_DIR)/bin
	cd $(BACKEND_DIR) && go build -o bin/superbet ./cmd/server

build: build-frontend build-backend ## Faz build do frontend e do backend

run: build-backend ## Roda apenas o binário Go (requer frontend/dist)
	@test -d $(STATIC_DIR) || { echo "ERRO: $(STATIC_DIR) nao existe. Rode 'make build-frontend' antes."; exit 1; }
	@test -x $(BINARY) || { echo "ERRO: $(BINARY) nao existe. Rode 'make build-backend' antes."; exit 1; }
	@echo "Servindo frontend de $(STATIC_DIR) em http://localhost:$(PORT)"
	STATIC_DIR=$(STATIC_DIR) PORT=$(PORT) $(BINARY)

run-go: build-backend ## Builda o backend e roda via 'go run' (requer frontend/dist)
	@test -d $(STATIC_DIR) || { echo "ERRO: $(STATIC_DIR) nao existe. Rode 'make build-frontend' antes."; exit 1; }
	@echo "Servindo frontend de $(STATIC_DIR) em http://localhost:$(PORT)"
	cd $(BACKEND_DIR) && STATIC_DIR=$(STATIC_DIR) PORT=$(PORT) go run ./cmd/server

dev: build-frontend build-backend ## Roda backend em background + Vite (HMR) em foreground
	@bash -c '\
		trap "echo; echo \"Encerrando...\"; kill 0" EXIT INT TERM; \
		echo "Backend em http://localhost:$(PORT)"; \
		STATIC_DIR=$(STATIC_DIR) PORT=$(PORT) $(BINARY) & \
		sleep 1; \
		echo "Vite em http://localhost:$(DEV_PORT)"; \
		cd $(FRONTEND_DIR) && npm run dev; \
	'

clean: ## Remove artefatos de build (dist, node_modules, bin)
	rm -rf $(FRONTEND_DIR)/dist
	rm -rf $(FRONTEND_DIR)/node_modules
	rm -rf $(BACKEND_DIR)/bin
