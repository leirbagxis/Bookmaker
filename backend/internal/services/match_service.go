package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"superbet/backend/internal/config"
	"superbet/backend/internal/db"
	"superbet/backend/internal/httpclient"
	"superbet/backend/internal/models"
)

// Broadcaster é a interface mínima que MatchService precisa do WebSocket Hub.
// Definida aqui para evitar ciclo de import entre services e websocket.
type Broadcaster interface {
	Broadcast(msg []byte)
}

type MatchService struct {
	cfg    *config.Config
	client *httpclient.Client
	db     *db.DB
	hub    Broadcaster
}

func NewMatchService(cfg *config.Config, c *httpclient.Client, database *db.DB, hub Broadcaster) *MatchService {
	return &MatchService{cfg: cfg, client: c, db: database, hub: hub}
}

func (s *MatchService) FetchAndSaveMatches(ctx context.Context) error {
	key := time.Now().Format("2006-01-02")
	url := fmt.Sprintf(
		"%s/v2/public/stats/events/by-date/%s?language=%s&sport_id=%s&date=%s&timezone_offset=%d",
		s.cfg.SuperScoreBase,
		s.cfg.BookmakerID,
		s.cfg.Language,
		s.cfg.SportID,
		key,
		s.cfg.TimezoneOffset,
	)

	var resp models.RawMatchesResponse
	if err := s.client.GetJSON(ctx, url, &resp); err != nil {
		return err
	}

	matches := make([]models.Match, 0)
	for _, comp := range resp.Competitions {
		compName := strings.TrimSpace(comp.Competition.Name)
		country := strings.ToUpper(strings.TrimSpace(comp.Competition.CountryCode.Value))
		if country == "" {
			country = strings.ToUpper(strings.TrimSpace(comp.Category.CountryCode.Value))
		}
		category := strings.TrimSpace(comp.Category.Name)
		for _, r := range comp.Matches {
			if m, ok := models.NormalizeMatch(r, compName, country, category); ok {
				matches = append(matches, m)
			}
		}
	}

	if len(matches) > 0 {
		if err := s.db.SaveMatches(matches); err != nil {
			return err
		}
		s.cleanupDatabase(matches)
	}

	// Broadcast para todos os clientes conectados
	if s.hub != nil {
		groups := GroupMatches(filterFinished(matches))
		data, err := json.Marshal(groups)
		if err == nil {
			s.hub.Broadcast(mustMarshal(models.ServerMessage{
				Type: "MATCHES_UPDATED",
				Data: data,
			}))
		}
	}

	return nil
}

// cleanupDatabase remove do banco:
//  1. Jogos com status finalizado (FT, FINISHED, CANCELLED, POSTPONED).
//  2. Jogos órfãos (presentes no banco, mas ausentes do fetch de hoje).
//
// Só é chamado quando o fetch retornou pelo menos 1 jogo — caso contrário
// a lista vazia não garante nada e poderíamos deletar tudo por engano.
func (s *MatchService) cleanupDatabase(fetched []models.Match) {
	finished, err := s.db.DeleteFinished()
	if err != nil {
		log.Printf("aviso: falha ao remover jogos finalizados: %v", err)
	} else if finished > 0 {
		log.Printf("limpeza: %d jogo(s) finalizado(s) removido(s) do banco", finished)
	}

	eventIDs := make([]int64, len(fetched))
	for i, m := range fetched {
		eventIDs[i] = m.EventID
	}
	orphans, err := s.db.DeleteNotIn(eventIDs)
	if err != nil {
		log.Printf("aviso: falha ao remover jogos órfãos: %v", err)
	} else if orphans > 0 {
		log.Printf("limpeza: %d jogo(s) órfão(s) removido(s) do banco", orphans)
	}
}

func (s *MatchService) GetTodayMatches(ctx context.Context) ([]CompetitionGroup, error) {
	matches, err := s.db.GetMatches()
	if err != nil {
		return nil, err
	}

	if len(matches) == 0 {
		err = s.FetchAndSaveMatches(ctx)
		if err != nil {
			return nil, err
		}
		matches, err = s.db.GetMatches()
		if err != nil {
			return nil, err
		}
	}

	filtered := filterFinished(matches)
	groups := GroupMatches(filtered)
	return groups, nil
}

func (s *MatchService) StartPolling(ctx context.Context) {
	interval := s.cfg.CacheTTL
	go func() {
		log.Printf("Iniciando polling de partidas (a cada %s)...", interval)
		if err := s.FetchAndSaveMatches(ctx); err != nil {
			log.Printf("Erro na busca inicial de partidas: %v", err)
		}
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := s.FetchAndSaveMatches(ctx); err != nil {
					log.Printf("Erro na rotina de busca de partidas: %v", err)
				}
			}
		}
	}()
}

func filterFinished(matches []models.Match) []models.Match {
	filtered := make([]models.Match, 0, len(matches))
	for _, m := range matches {
		if m.Status == "FT" || m.Status == "FINISHED" || m.Status == "POSTPONED" || m.Status == "CANCELLED" {
			continue
		}
		filtered = append(filtered, m)
	}
	return filtered
}

func mustMarshal(v interface{}) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		log.Printf("erro ao serializar mensagem: %v", err)
		return nil
	}
	return b
}
