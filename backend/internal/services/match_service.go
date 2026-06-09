package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"superbet/backend/internal/cache"
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
	cfg          *config.Config
	client       *httpclient.Client
	db           *db.DB
	hub          Broadcaster
	oddsRedis    *cache.OddsRedis
	lastBroadcast []byte
}

func NewMatchService(cfg *config.Config, c *httpclient.Client, database *db.DB, hub Broadcaster, oddsRedis *cache.OddsRedis) *MatchService {
	return &MatchService{cfg: cfg, client: c, db: database, hub: hub, oddsRedis: oddsRedis}
}

func (s *MatchService) FetchAndSaveMatches(ctx context.Context) error {
	loc := time.FixedZone("BRT", s.cfg.TimezoneOffset*3600)
	key := time.Now().In(loc).Format("2006-01-02")
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
		if err := s.oddsRedis.SetManyOdds(ctx, matches); err != nil {
			log.Printf("aviso: falha ao salvar odds no Redis: %v", err)
		}
		s.cleanupRedis(ctx, matches)
	}

	if s.hub != nil {
		groups := GroupMatches(filterFinished(matches))
		data, err := json.Marshal(groups)
		if err == nil && !bytes.Equal(data, s.lastBroadcast) {
			s.hub.Broadcast(mustMarshal(models.ServerMessage{
				Type: "MATCHES_UPDATED",
				Data: data,
			}))
			s.lastBroadcast = data
		}
	}

	return nil
}

func (s *MatchService) cleanupRedis(ctx context.Context, fetched []models.Match) {
	fetchedIDs := make(map[int64]bool)
	for _, m := range fetched {
		fetchedIDs[m.EventID] = true
	}

	allOdds, err := s.oddsRedis.GetAllOdds(ctx)
	if err != nil {
		log.Printf("aviso: falha ao buscar odds do Redis para limpeza: %v", err)
		return
	}

	var toDelete []int64
	for _, odd := range allOdds {
		if !fetchedIDs[odd.EventID] {
			toDelete = append(toDelete, odd.EventID)
		}
	}

	if len(toDelete) > 0 {
		if err := s.oddsRedis.DeleteManyOdds(ctx, toDelete); err != nil {
			log.Printf("aviso: falha ao remover odds órfãs do Redis: %v", err)
		} else {
			log.Printf("limpeza: %d odds órfã(s) removida(s) do Redis", len(toDelete))
		}
	}
}

func (s *MatchService) GetTodayMatches(ctx context.Context) ([]CompetitionGroup, error) {
	matches, err := s.oddsRedis.GetAllOdds(ctx)
	if err != nil {
		return nil, err
	}

	if len(matches) == 0 {
		if err = s.FetchAndSaveMatches(ctx); err != nil {
			return nil, err
		}
		matches, err = s.oddsRedis.GetAllOdds(ctx)
		if err != nil {
			return nil, err
		}
	}

	filtered := filterFinished(matches)
	groups := GroupMatches(filtered)
	return groups, nil
}

func (s *MatchService) GetDatabase() *db.DB {
	return s.db
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
