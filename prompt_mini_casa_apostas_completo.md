# Prompt Completo — Mini Casa de Apostas Fake estilo Bet365

Crie uma aplicação web completa de apostas esportivas fake/simulada, inspirada na experiência visual de casas de apostas como Bet365, porém sem usar marca, logo, identidade visual registrada, dinheiro real, pagamentos reais ou apostas reais.

A plataforma deve ser apenas uma simulação visual e funcional para fins educacionais, demonstração e desenvolvimento.

---

# 1. Objetivo Geral

Desenvolver uma aplicação web onde o usuário possa:

- Ver partidas de futebol do dia.
- Ver odds principais diretamente na página inicial.
- Acessar uma página detalhada de cada partida.
- Visualizar todas as odds disponíveis daquele jogo.
- Criar uma aposta fake/simulada.
- Adicionar seleções ao bilhete.
- Calcular retorno potencial fictício.
- Confirmar uma aposta simulada.

A aplicação deve ter foco total em dispositivos móveis, mas também funcionar bem no desktop.

---

# 2. Stack Obrigatória

## Backend

- Golang
- WebSocket
- HTTP Client para consumir APIs externas
- Cache em memória
- Servidor único para backend e frontend

## Frontend

- React
- TypeScript preferencialmente
- CSS responsivo
- Mobile-first
- Comunicação com backend somente via WebSocket

---

# 3. Requisito Arquitetural Obrigatório

O frontend e o backend devem ser conectados por um único servidor.

Isso significa que o backend Golang deve servir:

- A aplicação React compilada
- O WebSocket
- As rotas internas necessárias
- O cache
- A lógica de consumo das APIs externas

Não deve existir frontend e backend separados em produção.

A aplicação deve funcionar assim:

```txt
Internet
    ↓
Servidor Golang único
    ├── Serve arquivos estáticos do React
    ├── Mantém conexão WebSocket com o frontend
    ├── Consome APIs externas por HTTP
    ├── Faz cache dos dados
    └── Envia dados ao frontend via WebSocket
```

Exemplo de rotas:

```txt
GET /
GET /assets/*
GET /ws
```

O React deve ser compilado com:

```bash
npm run build
```

E o resultado do build deve ser servido pelo Golang.

Em produção, não deve ser necessário rodar servidor Node.js.

O deploy final deve ser possível com apenas o binário Golang e os arquivos estáticos do React, ou usando embed do Go.

---

# 4. Comunicação

## APIs externas

O backend Golang deve consumir as APIs externas usando HTTP.

O frontend nunca deve chamar diretamente as APIs externas.

## Frontend e Backend

O frontend React deve se comunicar com o backend Golang usando WebSocket.

Toda troca principal de dados entre frontend e backend deve ocorrer por WebSocket.

---

# 5. API de Jogos do Dia

O backend deve buscar os jogos do dia usando esta API:

```txt
https://api.content-prod.superscore.live/v2/public/stats/events/by-date/76?language=pt-BR&sport_id=1&date=YYYY-MM-DD&timezone_offset=-3
```

Exemplo:

```txt
https://api.content-prod.superscore.live/v2/public/stats/events/by-date/76?language=pt-BR&sport_id=1&date=2026-06-05&timezone_offset=-3
```

A data deve ser dinâmica.

Usar a data atual no formato:

```txt
YYYY-MM-DD
```

O timezone deve considerar Brasil:

```txt
timezone_offset=-3
```

A resposta contém uma chave:

```json
"matches": []
```

Cada partida pode conter odds principais:

```json
"odds": [
  {
    "price": 2.47,
    "outcome_id": 1470,
    "uuid": "bf63d000-4f6a-5b0d-a56e-a1cf834e02f2",
    "event_id": 12312215,
    "name": "1"
  },
  {
    "price": 2.72,
    "outcome_id": 1471,
    "uuid": "6fd1baf9-6ee8-5156-9265-b58b493684a8",
    "event_id": 12312215,
    "name": "X"
  },
  {
    "price": 3.45,
    "outcome_id": 1472,
    "uuid": "3e9e7eca-d199-52b4-8f38-6009ba6b0048",
    "event_id": 12312215,
    "name": "2"
  }
]
```

Essas odds representam:

- `1`: vitória do time da casa
- `X`: empate
- `2`: vitória do time visitante

---

# 6. Filtro de Partidas

A aplicação deve mostrar somente jogos que tenham suporte a odds.

Regras obrigatórias:

- Se o jogo não tiver a chave `odds`, não mostrar.
- Se `odds` estiver vazio, não mostrar.
- Se não existir odd `1`, não mostrar.
- Se não existir odd `X`, não mostrar.
- Se não existir odd `2`, não mostrar.
- Se não existir `event_id`, não mostrar.
- Jogos sem suporte a odds não devem aparecer em nenhuma tela.

---

# 7. API de Odds Completas por Jogo

Ao clicar em uma partida, o frontend deve enviar uma mensagem WebSocket para o backend solicitando as odds completas.

O backend deve pegar o `event_id` da partida e chamar:

```txt
https://production-superbet-offer-br.freetls.fastly.net/v2/pt-BR/events/{event_id}?oddsResults=false
```

Exemplo:

```txt
https://production-superbet-offer-br.freetls.fastly.net/v2/pt-BR/events/12312215?oddsResults=false
```

Essa API retorna todas as odds disponíveis para aquele jogo.

O backend deve enviar esses dados ao frontend via WebSocket.

---

# 8. Página Inicial

A página inicial deve mostrar todos os jogos do dia com odds.

A lista deve ser agrupada por campeonato.

A ordem de prioridade dos campeonatos deve ser:

1. Copa do Brasil
2. Libertadores
3. Brasileirão Série A
4. Brasileirão Série B
5. Premier League
6. La Liga
7. Serie A Italiana
8. Bundesliga
9. Ligue 1
10. Champions League
11. Europa League
12. Copa do Mundo
13. Amistosos
14. Outros campeonatos

Campeonatos que não estiverem nessa lista devem aparecer em “Outros campeonatos”.

Cada seção deve mostrar o nome do campeonato e os jogos pertencentes a ele.

Exemplo:

```txt
Copa do Brasil

Flamengo x Palmeiras
18:30
1 2.10 | X 3.20 | 2 3.80

Santos x Vitória
21:00
1 2.47 | X 2.72 | 2 3.45
```

Cada card de jogo deve conter:

- Campeonato
- Horário
- Time da casa
- Time visitante
- Odd da casa
- Odd do empate
- Odd de fora
- Estado do jogo, se disponível

Ao clicar no card do jogo, o usuário deve ser levado para a página de detalhes.

---

# 9. Página de Detalhes da Partida

A página de detalhes deve mostrar:

- Nome do time da casa
- Nome do time visitante
- Campeonato
- Horário da partida
- Placar, se disponível
- Status da partida, se disponível
- Odds principais
- Todas as odds disponíveis
- Botões para adicionar odds ao bilhete
- Botão ou área para “Criar Aposta”

As odds completas devem ser organizadas por mercado.

Exemplos de mercados:

- Resultado final
- Total de gols
- Ambas marcam
- Handicap
- Dupla chance
- Primeiro tempo
- Segundo tempo
- Escanteios
- Cartões
- Jogador marca gol
- Outros mercados

Caso a API retorne nomes diferentes, usar os nomes vindos da própria API.

---

# 10. Criar Aposta

Criar um sistema de bilhete fake/simulado.

O usuário deve poder:

- Selecionar uma odd
- Adicionar ao bilhete
- Selecionar várias odds
- Remover uma seleção
- Limpar bilhete
- Digitar valor fictício da aposta
- Ver odd total
- Ver retorno potencial fictício
- Confirmar aposta simulada

Cálculo:

```txt
odd_total = multiplicação de todas as odds selecionadas
retorno_potencial = valor_apostado * odd_total
```

Exemplo:

```txt
Valor apostado: R$ 10,00
Odd total: 5.40
Retorno potencial: R$ 54,00
```

Ao confirmar, mostrar:

```txt
Aposta simulada criada com sucesso.
```

Não implementar:

- Pagamento real
- Carteira real
- Depósito
- Saque
- Gateway de pagamento
- KYC
- Aposta real
- Integração com casa de apostas real

---

# 11. WebSocket

Criar tipos de mensagens claros entre frontend e backend.

## Buscar jogos do dia

Mensagem enviada pelo frontend:

```json
{
  "type": "GET_TODAY_MATCHES"
}
```

Resposta do backend:

```json
{
  "type": "TODAY_MATCHES",
  "data": []
}
```

## Buscar odds completas

Mensagem enviada pelo frontend:

```json
{
  "type": "GET_EVENT_ODDS",
  "event_id": 12312215
}
```

Resposta do backend:

```json
{
  "type": "EVENT_ODDS",
  "event_id": 12312215,
  "data": {}
}
```

## Erro

```json
{
  "type": "ERROR",
  "message": "Erro ao buscar odds"
}
```

## Ping/Pong

Implementar ping/pong ou mecanismo simples para manter conexão viva.

---

# 12. Cache

Implementar cache em memória no backend.

## Cache dos jogos do dia

- Chave: data atual
- Duração: 30 a 60 segundos

## Cache das odds completas

- Chave: event_id
- Duração: 30 a 60 segundos

O cache deve evitar chamadas excessivas às APIs externas.

Quando o cache expirar, buscar dados novos.

---

# 13. Backend Golang

O backend deve conter:

- Servidor HTTP
- WebSocket handler
- Cliente HTTP para APIs externas
- Serviços para buscar partidas
- Serviços para buscar odds completas
- Filtro de jogos sem odds
- Cache em memória
- Servidor de arquivos estáticos do React
- Fallback para SPA React

## Estrutura sugerida

```txt
backend/
  cmd/
    server/
      main.go
  internal/
    config/
    cache/
    models/
    services/
    websocket/
    httpclient/
    static/
  go.mod
```

## Responsabilidades

### `main.go`

- Inicializar servidor
- Configurar rotas
- Servir React build
- Iniciar WebSocket
- Configurar porta

### `services`

- Buscar jogos do dia
- Buscar odds completas
- Filtrar partidas inválidas
- Organizar campeonatos

### `websocket`

- Gerenciar conexões
- Ler mensagens do frontend
- Enviar respostas
- Tratar erros

### `cache`

- Guardar dados temporários
- Verificar expiração
- Atualizar dados

---

# 14. Servir React pelo Golang

Após o build do React, os arquivos devem ficar em algo como:

```txt
frontend/dist
```

ou:

```txt
frontend/build
```

O Golang deve servir esses arquivos.

Exemplo conceitual:

```go
fs := http.FileServer(http.Dir("./frontend/dist"))
http.Handle("/", fs)
```

Também deve existir fallback para rotas SPA.

Exemplo:

```txt
/event/12312215
```

Essa rota deve retornar o `index.html` do React, e o React Router deve cuidar da navegação.

---

# 15. Frontend React

Criar frontend com React.

Preferencialmente usar:

- TypeScript
- React Router
- Context API ou Zustand para estado global
- CSS Modules, Tailwind ou CSS puro organizado

## Páginas

```txt
/
/event/:eventId
```

## Componentes sugeridos

```txt
App
WebSocketProvider
HomePage
MatchList
CompetitionSection
MatchCard
EventPage
OddsMarket
OddButton
BetSlip
BottomNavigation
LoadingState
ErrorState
EmptyState
```

---

# 16. Estado Global

O frontend deve manter:

- Lista de partidas do dia
- Estado da conexão WebSocket
- Jogo selecionado
- Odds completas do jogo
- Bilhete de aposta
- Valor fictício apostado
- Odd total
- Retorno potencial

---

# 17. Design Visual

Criar uma interface inspirada em casas de apostas modernas, mas sem copiar marca, logo, textos protegidos ou identidade visual exata da Bet365.

Estilo desejado:

- Fundo escuro
- Verde escuro como cor principal
- Verde claro para destaques
- Cards com bordas arredondadas
- Odds em botões retangulares
- Texto claro
- Boa separação entre campeonatos
- Header compacto
- Mobile-first
- Visual limpo e profissional

## Mobile

No mobile:

- Lista em coluna
- Header fixo
- Navegação inferior fixa
- Bilhete como drawer inferior
- Odds fáceis de tocar
- Cards grandes o suficiente para toque

## Desktop

No desktop:

- Layout em duas colunas
- Lista de jogos no centro/esquerda
- Bilhete fixo à direita
- Odds em grid
- Mais espaçamento visual

---

# 18. Home Mobile

A home mobile deve parecer com um app de apostas.

Estrutura sugerida:

```txt
Header
  Logo fake/nome da plataforma
  Ícone de menu

Abas rápidas
  Hoje
  Ao vivo
  Futebol
  Favoritos

Lista de campeonatos
  Campeonato
    Card do jogo
    Odds 1 X 2

Bottom Navigation
  Início
  Ao vivo
  Bilhete
  Perfil fake
```

---

# 19. Bilhete Mobile

O bilhete no mobile deve abrir como drawer inferior.

Quando não houver seleções:

```txt
Seu bilhete está vazio
Selecione uma odd para começar
```

Quando houver seleções:

```txt
Bilhete
- Flamengo vence @ 2.10
- Mais de 2.5 gols @ 1.85

Valor: R$ 10,00
Odd total: 3.88
Retorno potencial: R$ 38,80

Confirmar aposta simulada
```

---

# 20. Tratamento de Erros

Exibir mensagens amigáveis quando:

- A API externa falhar
- Não houver jogos com odds
- A conexão WebSocket cair
- O jogo não possuir odds completas
- O backend não conseguir interpretar a resposta
- O cache estiver vazio e a API falhar

Mensagens sugeridas:

```txt
Nenhum jogo com odds disponível hoje.
```

```txt
Erro ao carregar partidas. Tente novamente.
```

```txt
Erro ao carregar odds deste jogo.
```

```txt
Conexão perdida. Tentando reconectar...
```

---

# 21. Reconexão WebSocket

O frontend deve tentar reconectar automaticamente caso o WebSocket caia.

Estratégia simples:

- Tentar reconectar após 2 segundos
- Depois 5 segundos
- Depois 10 segundos
- Limitar tentativas ou continuar com backoff simples

Mostrar estado visual da conexão.

---

# 22. Normalização dos Dados

Como a API externa pode ter formato complexo, criar modelos internos mais simples.

## Modelo de partida no frontend

```ts
type Match = {
  eventId: number;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  startTime: string;
  status?: string;
  homeOdd: number;
  drawOdd: number;
  awayOdd: number;
};
```

## Modelo de mercado

```ts
type OddsMarket = {
  id: string;
  name: string;
  selections: OddSelection[];
};
```

## Modelo de seleção

```ts
type OddSelection = {
  id: string;
  eventId: number;
  marketName: string;
  name: string;
  price: number;
  homeTeam?: string;
  awayTeam?: string;
};
```

---

# 23. Organização dos Campeonatos

Criar função para priorizar campeonatos.

A função deve receber o nome do campeonato e retornar uma prioridade numérica.

Exemplo:

```txt
Copa do Brasil => 1
Libertadores => 2
Brasileirão Série A => 3
Brasileirão Série B => 4
Premier League => 5
La Liga => 6
Serie A => 7
Bundesliga => 8
Ligue 1 => 9
Champions League => 10
Europa League => 11
Copa do Mundo => 12
Amistosos => 13
Outros => 99
```

Ordenar primeiro por prioridade e depois por horário.

---

# 24. Segurança e Limites

Como é um projeto fake:

- Não coletar dados bancários
- Não pedir CPF
- Não pedir documentos
- Não permitir depósitos reais
- Não permitir saques reais
- Não induzir o usuário a apostar dinheiro real
- Exibir em algum lugar que é uma simulação

Adicionar aviso no rodapé:

```txt
Projeto demonstrativo. Apostas simuladas. Não envolve dinheiro real.
```

---

# 25. Variáveis de Ambiente

Permitir configurar:

```env
PORT=8080
CACHE_TTL_SECONDS=60
TIMEZONE_OFFSET=-3
```

Opcional:

```env
SUPER_SCORE_BASE_URL=https://api.content-prod.superscore.live
SUPERBET_BASE_URL=https://production-superbet-offer-br.freetls.fastly.net
```

---

# 26. Comandos Esperados

## Desenvolvimento frontend

```bash
cd frontend
npm install
npm run dev
```

## Build frontend

```bash
cd frontend
npm run build
```

## Rodar backend

```bash
cd backend
go run ./cmd/server
```

## Produção

O backend deve servir o frontend compilado.

```bash
go build -o app ./cmd/server
./app
```

---

# 27. Estrutura Final Sugerida

```txt
project/
  backend/
    cmd/
      server/
        main.go
    internal/
      cache/
        cache.go
      config/
        config.go
      httpclient/
        client.go
      models/
        match.go
        odds.go
        websocket.go
      services/
        match_service.go
        odds_service.go
      websocket/
        hub.go
        handler.go
        messages.go
      static/
        static.go
    go.mod

  frontend/
    index.html
    package.json
    vite.config.ts
    src/
      main.tsx
      App.tsx
      routes/
      pages/
        HomePage.tsx
        EventPage.tsx
      components/
        Header.tsx
        MatchCard.tsx
        CompetitionSection.tsx
        OddButton.tsx
        OddsMarket.tsx
        BetSlip.tsx
        BottomNavigation.tsx
        LoadingState.tsx
        ErrorState.tsx
        EmptyState.tsx
      context/
        WebSocketContext.tsx
        BetSlipContext.tsx
      types/
        match.ts
        odds.ts
        websocket.ts
      styles/
        global.css
```

---

# 28. Requisitos de Qualidade

O código deve ser:

- Limpo
- Modular
- Fácil de entender
- Fácil de expandir
- Com tratamento de erros
- Sem duplicação desnecessária
- Com nomes claros
- Separando responsabilidade de cada camada

---

# 29. Resultado Final Esperado

Entregar uma aplicação funcional com:

- Backend em Golang
- Frontend em React
- Frontend e backend servidos por um único servidor Golang
- WebSocket entre frontend e backend
- Backend consumindo APIs externas por HTTP
- Tela inicial com jogos do dia
- Filtro para mostrar apenas jogos com odds
- Organização por campeonato
- Página de detalhes com todas as odds do jogo
- Bilhete de aposta fake
- Cálculo de odd total
- Cálculo de retorno potencial fictício
- Layout responsivo mobile-first
- Design escuro inspirado em casa de apostas
- Sem apostas reais
- Sem dinheiro real
- Sem pagamentos reais

---

# 30. Importante

Não criar uma casa de apostas real.

Criar somente uma simulação visual e funcional.

A plataforma deve deixar claro que é um projeto demonstrativo e que não envolve dinheiro real.

O frontend deve ser servido pelo próprio backend Golang.

A comunicação entre frontend e backend deve ser via WebSocket.

O backend deve ser o único responsável por chamar as APIs externas.

