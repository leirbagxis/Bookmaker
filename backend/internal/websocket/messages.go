package websocket

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"superbet/backend/internal/models"
	"superbet/backend/internal/services"
)

type Server struct {
	Hub     *Hub
	Matches *services.MatchService
	Odds    *services.OddsService
}

func (s *Server) Dispatch(c *Client, raw []byte) {
	var msg models.ClientMessage
	if err := json.Unmarshal(raw, &msg); err != nil {
		s.sendError(c, "Mensagem inválida")
		return
	}

	switch msg.Type {
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
