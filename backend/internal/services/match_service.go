package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"superbet/backend/internal/config"
	"superbet/backend/internal/db"
	"superbet/backend/internal/httpclient"
	"superbet/backend/internal/models"
)

type MatchService struct {
	cfg    *config.Config
	client *httpclient.Client
	db     *db.DB
}

func NewMatchService(cfg *config.Config, c *httpclient.Client, database *db.DB) *MatchService {
	return &MatchService{cfg: cfg, client: c, db: database}
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
	}
	return nil
}

func (s *MatchService) GetTodayMatches(ctx context.Context) ([]CompetitionGroup, error) {
	// Pega do banco de dados local
	matches, err := s.db.GetMatches()
	if err != nil {
		return nil, err
	}
	
	// Se banco vazio, tenta uma chamada on demand
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

	// Filtra jogos finalizados
	filtered := make([]models.Match, 0)
	for _, m := range matches {
		if m.Status == "FT" || m.Status == "FINISHED" || m.Status == "POSTPONED" || m.Status == "CANCELLED" {
			continue
		}
		filtered = append(filtered, m)
	}

	groups := GroupMatches(filtered)
	return groups, nil
}

func (s *MatchService) StartPolling(ctx context.Context) {
	go func() {
		log.Println("Iniciando polling de partidas (a cada 30s)...")
		// Primeira chamada
		if err := s.FetchAndSaveMatches(ctx); err != nil {
			log.Printf("Erro na busca inicial de partidas: %v", err)
		}
		ticker := time.NewTicker(30 * time.Second)
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
