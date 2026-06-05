# SuperBet

Aplicação web de simulação de apostas esportivas (projeto demonstrativo, sem dinheiro real).

## Stack

- Backend: Golang (`net/http` + `gorilla/websocket`), servidor único que serve o frontend compilado.
- Frontend: React 18 + TypeScript + Vite, mobile-first.
- Comunicação: WebSocket exclusivo entre frontend e backend.
- Cache em memória no backend, TTL configurável.

## Pré-requisitos

- Go 1.26+
- Node.js 20+ e npm
- `make` (opcional, para usar os atalhos abaixo)

## Comandos rápidos (Makefile)

```bash
make           # mostra a ajuda com todos os alvos
make build     # builda frontend e backend
make run       # roda apenas o binário Go (requer frontend/dist)
make run-go    # builda o backend e roda via 'go run'
make dev       # backend em background + Vite (HMR) em foreground
make clean     # remove dist, node_modules e bin
```

Para personalizar a porta:

```bash
make run PORT=9000
```

## Configuração

Copie `.env.example` para `.env` (opcional) e ajuste se necessário:

```env
PORT=8080
CACHE_TTL_SECONDS=60
TIMEZONE_OFFSET=-3
```

## Desenvolvimento (dois terminais)

```bash
# Terminal 1 — backend
cd backend
go run ./cmd/server

# Terminal 2 — frontend (com HMR e proxy de /ws)
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`. O Vite faz proxy de `/ws` para `:8080`.

## Build e produção (binário único)

```bash
cd frontend
npm install
npm run build

cd ../backend
go build -o app ./cmd/server
./app
```

Acesse `http://localhost:8080`. O binário Go serve o build do React que está em `frontend/dist`.

## Estrutura

```txt
backend/
  cmd/server/main.go
  internal/
    config/        # envs
    cache/         # cache em memória com TTL
    httpclient/    # cliente HTTP das APIs externas
    models/        # match, odds, websocket
    services/      # regras (filtro, prioridade, organização)
    websocket/     # hub, handler, dispatch
    static/        # serving do build do React + fallback SPA

frontend/
  index.html
  src/
    main.tsx
    App.tsx
    pages/         # HomePage, EventPage
    components/    # Header, MatchCard, CompetitionSection, OddButton, OddsMarket, BetSlip, BottomNavigation, LoadingState, ErrorState, EmptyState
    context/       # WebSocketContext, BetSlipContext
    types/         # match, odds, websocket
    styles/        # global, home, event, betslip
```

## Aviso

Projeto demonstrativo. Apostas simuladas. Não envolve dinheiro real.
