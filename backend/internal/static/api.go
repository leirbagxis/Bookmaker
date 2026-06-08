package static

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"superbet/backend/internal/models"
	"superbet/backend/internal/services"
	"superbet/backend/internal/websocket"
)

type APIHandler struct {
	Users   *services.UserService
	Betting *services.BettingService
	Hub     *websocket.Hub
}

func NewAPIHandler(u *services.UserService, b *services.BettingService, h *websocket.Hub) *APIHandler {
	return &APIHandler{Users: u, Betting: b, Hub: h}
}

func (h *APIHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/login", h.handleLogin)
	mux.HandleFunc("POST /api/bets", h.handlePlaceBet)
	mux.HandleFunc("GET /api/bets", h.handleMyBets)
}

func sendJSONError(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func (h *APIHandler) handleLogin(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		sendJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	u, err := h.Users.Login(r.Context(), body.Username)
	if err != nil {
		log.Printf("login error for %s: %v", body.Username, err)
		sendJSONError(w, "login failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(u)
}

func (h *APIHandler) handlePlaceBet(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username       string                   `json:"username"`
		Amount         float64                  `json:"amount"`
		Selections     []models.TicketSelection `json:"selections"`
		IdempotencyKey string                   `json:"idempotencyKey"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		sendJSONError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	user, err := h.Users.GetUser(body.Username)
	if err != nil || user == nil {
		sendJSONError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if user.Balance < body.Amount {
		sendJSONError(w, "saldo insuficiente", http.StatusForbidden)
		return
	}

	externalID, err := h.Betting.PlaceBet(r.Context(), user.ID, body.Amount, body.Selections, body.IdempotencyKey)
	if err != nil {
		sendJSONError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Lógica de Mock baseada no valor (re-utilizando a do WS)
	isWonMock := body.Amount > 7.76 && body.Amount < 7.78
	isLostMock := body.Amount > 6.65 && body.Amount < 6.67

	if isWonMock || isLostMock {
		tickets, _ := h.Betting.GetDatabase().GetTicketsByUser(user.ID)
		for _, t := range tickets {
			if t.ExternalID == externalID {
				if isWonMock {
					h.Betting.GetDatabase().UpdateTicketStatus(r.Context(), t.ID, models.TicketStatusWon)
					h.Betting.GetDatabase().UpdateUserBalance(r.Context(), user.ID, t.PossibleWin)
					user.Balance += t.PossibleWin
				} else {
					h.Betting.GetDatabase().UpdateTicketStatus(r.Context(), t.ID, models.TicketStatusLost)
				}
				break
			}
		}
	}
	
	user.Balance -= body.Amount

	// Notificar o WebSocket sobre o novo saldo para atualizar o cabeçalho automaticamente
	h.notifyBalanceUpdate(user)

	resp := struct {
		ID      string       `json:"id"`
		Message string       `json:"message"`
		User    *models.User `json:"user"`
	}{
		ID:      externalID,
		Message: fmt.Sprintf("Aposta realizada com sucesso! ID: %s", externalID),
		User:    user,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *APIHandler) handleMyBets(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "username required", http.StatusBadRequest)
		return
	}

	user, err := h.Users.GetUser(username)
	if err != nil || user == nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	tickets, err := h.Betting.GetDatabase().GetTicketsByUser(user.ID)
	if err != nil {
		http.Error(w, "error fetching tickets", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tickets)
}

func (h *APIHandler) notifyBalanceUpdate(user *models.User) {
	data, _ := json.Marshal(user)
	msg := models.ServerMessage{
		Type: "BALANCE_UPDATE",
		Data: data,
	}
	raw, _ := json.Marshal(msg)
	h.Hub.Broadcast(raw)
}
