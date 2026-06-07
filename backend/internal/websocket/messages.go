package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"superbet/backend/internal/models"
	"superbet/backend/internal/services"
)

type Server struct {
	Hub     *Hub
	Matches *services.MatchService
	Odds    *services.OddsService
	Users   *services.UserService
	Betting *services.BettingService
}

func (s *Server) Dispatch(c *Client, raw []byte) {
	var msg models.ClientMessage
	if err := json.Unmarshal(raw, &msg); err != nil {
		log.Printf("Erro ao processar mensagem do cliente: %v | RAW: %s", err, string(raw))
		s.sendError(c, "Mensagem inválida")
		return
	}

	switch msg.Type {
	case "LOGIN":
		if msg.Username == "" {
			s.sendError(c, "username ausente")
			return
		}
		s.handleLogin(c, msg.Username)
	case "PLACE_BET":
		user := c.GetUser()
		if user == nil {
			s.sendError(c, "Você precisa estar logado para apostar")
			return
		}
		s.handlePlaceBet(c, user, msg.Amount, msg.Selections)
	case "GET_MY_BETS":
		user := c.GetUser()
		if user == nil {
			s.sendError(c, "Você precisa estar logado para ver seus bilhetes")
			return
		}
		s.handleMyBets(c, user.ID)
	case "GET_TODAY_MATCHES":
		s.handleTodayMatches(c)
	case "GET_EVENT_ODDS":
		if msg.EventID == nil {
			s.sendError(c, "event_id ausente")
			return
		}
		s.handleEventOdds(c, *msg.EventID)
	case "UNSUBSCRIBE_EVENT":
		if msg.EventID == nil {
			return
		}
		s.Hub.UnsubscribeEvent(c, *msg.EventID)
	case "PING":
		s.send(c, models.ServerMessage{Type: "PONG"})
	default:
		s.sendError(c, "Tipo de mensagem desconhecido: "+msg.Type)
	}
}

func (s *Server) handleLogin(c *Client, username string) {
	u, err := s.Users.Login(context.Background(), username)
	if err != nil {
		s.sendError(c, "Erro ao fazer login")
		return
	}
	c.SetUser(u)
	data, _ := json.Marshal(u)
	s.send(c, models.ServerMessage{Type: "LOGIN_SUCCESS", Data: data})
}

func (s *Server) handlePlaceBet(c *Client, user *models.User, amount float64, selections []models.TicketSelection) {
	// Re-verificar saldo local antes de tentar no banco (opcional, o banco já faz em TX)
	if user.Balance < amount {
		s.sendError(c, "Saldo insuficiente")
		return
	}

	externalID, err := s.Betting.PlaceBet(context.Background(), user.ID, amount, selections)
	if err != nil {
		log.Printf("ERRO CRÍTICO AO SALVAR TICKET: %v", err)
		s.sendError(c, "erro ao processar aposta: verifique seu saldo")
		return
	}

	// Importante: Descontar o saldo do objeto local para refletir no BALANCE_UPDATE
	user.Balance -= amount

	// LÓGICA DE TESTE (A PEDIDO DO USUÁRIO):
	isWonMock := amount > 7.76 && amount < 7.78
	isLostMock := amount > 6.65 && amount < 6.67
	
	if isWonMock || isLostMock {
		tickets, _ := s.Matches.GetDatabase().GetTicketsByUser(user.ID)
		for _, t := range tickets {
			if t.ExternalID == externalID {
				if isWonMock {
					s.Matches.GetDatabase().UpdateTicketStatus(t.ID, "WON")
					s.Matches.GetDatabase().UpdateUserBalance(nil, user.ID, t.PossibleWin)
					user.Balance += t.PossibleWin // Soma o prêmio
				} else {
					s.Matches.GetDatabase().UpdateTicketStatus(t.ID, "LOST")
				}
				break
			}
		}
	}

	c.SetUser(user)

	// Mandar o externalID para o frontend saber que deu certo e mostrar no recibo
	s.send(c, models.ServerMessage{
		Type:    "BET_PLACED", 
		Message: fmt.Sprintf("Aposta realizada com sucesso! ID: %s", externalID),
		Data:    []byte(fmt.Sprintf(`{"id": "%s"}`, externalID)),
	})
	
	userData, _ := json.Marshal(user)
	s.send(c, models.ServerMessage{Type: "BALANCE_UPDATE", Data: userData})
}

func (s *Server) handleMyBets(c *Client, userID int64) {
	tickets, err := s.Matches.GetDatabase().GetTicketsByUser(userID)
	if err != nil {
		log.Printf("erro ao buscar tickets: %v", err)
		s.sendError(c, "Erro ao buscar seus bilhetes")
		return
	}
	data, _ := json.Marshal(tickets)
	s.send(c, models.ServerMessage{Type: "MY_BETS", Data: data})
}

func (s *Server) handleTodayMatches(c *Client) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	groups, err := s.Matches.GetTodayMatches(ctx)
	if err != nil {
		log.Printf("erro ao buscar partidas: %v", err)
		s.sendError(c, "Erro ao buscar partidas")
		return
	}
	data, _ := json.Marshal(groups)
	s.send(c, models.ServerMessage{Type: "TODAY_MATCHES", Data: data})
}

func (s *Server) handleEventOdds(c *Client, eventID int64) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	markets, err := s.Odds.GetEventOdds(ctx, eventID)
	if err != nil {
		log.Printf("erro ao buscar odds: %v", err)
		s.sendError(c, "Erro ao buscar odds")
		return
	}
	// Marca cliente como observador deste evento para receber ODDS_UPDATED
	s.Hub.SubscribeEvent(c, eventID)

	data, _ := json.Marshal(markets)
	s.send(c, models.ServerMessage{Type: "EVENT_ODDS", EventID: eventID, Data: data})
}

func (s *Server) sendError(c *Client, msg string) {
	s.send(c, models.ServerMessage{Type: "ERROR", Message: msg})
}

func (s *Server) send(c *Client, m models.ServerMessage) {
	b, err := json.Marshal(m)
	if err != nil {
		log.Printf("erro ao serializar mensagem: %v", err)
		return
	}
	select {
	case c.send <- b:
	default:
		log.Printf("buffer do cliente cheio, descartando mensagem")
	}
}
