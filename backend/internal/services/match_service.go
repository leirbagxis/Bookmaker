package services

import (
	"context"
	"fmt"
	"time"

	"superbet/backend/internal/cache"
	"superbet/backend/internal/config"
	"superbet/backend/internal/httpclient"
	"superbet/backend/internal/models"
)

type MatchService struct {
	cfg    *config.Config
	client *httpclient.Client
	cache  *cache.Cache[string, []CompetitionGroup]
}

func NewMatchService(cfg *config.Config, c *httpclient.Client, cc *cache.Cache[string, []CompetitionGroup]) *MatchService {
	return &MatchService{cfg: cfg, client: c, cache: cc}
}

func (s *MatchService) GetTodayMatches(ctx context.Context) ([]CompetitionGroup, error) {
	key := time.Now().Format("2006-01-02")
	if cached, ok := s.cache.Get(key); ok {
		return cached, nil
	}

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
		return nil, err
	}

	matches := make([]models.Match, 0, len(resp.Matches))
	for _, r := range resp.Matches {
		if m, ok := models.NormalizeMatch(r); ok {
			matches = append(matches, m)
		}
	}

	groups := GroupMatches(matches)
	s.cache.Set(key, groups)
	return groups, nil
}
