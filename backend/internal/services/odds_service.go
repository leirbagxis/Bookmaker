package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"

	"superbet/backend/internal/cache"
	"superbet/backend/internal/config"
	"superbet/backend/internal/httpclient"
	"superbet/backend/internal/models"
)

type OddsService struct {
	cfg    *config.Config
	client *httpclient.Client
	cache  *cache.Cache[int64, []models.OddsMarket]
}

func NewOddsService(cfg *config.Config, c *httpclient.Client, cc *cache.Cache[int64, []models.OddsMarket]) *OddsService {
	return &OddsService{cfg: cfg, client: c, cache: cc}
}

func (s *OddsService) GetEventOdds(ctx context.Context, eventID int64) ([]models.OddsMarket, error) {
	if cached, ok := s.cache.Get(eventID); ok {
		return cached, nil
	}

	url := fmt.Sprintf("%s/v2/pt-BR/events/%d?oddsResults=false", s.cfg.SuperbetBase, eventID)

	body, err := s.fetch(ctx, url)
	if err != nil {
		return nil, err
	}

	markets := models.NormalizeEventOdds(body)
	if len(markets) == 0 {
		var anyShape map[string]json.RawMessage
		if err2 := json.Unmarshal(body, &anyShape); err2 == nil {
			for _, key := range []string{"data", "event", "result"} {
				if v, ok := anyShape[key]; ok {
					markets = models.NormalizeEventOdds(v)
					if len(markets) > 0 {
						break
					}
				}
			}
		}
	}

	s.cache.Set(eventID, markets)
	return markets, nil
}

func (s *OddsService) fetch(ctx context.Context, url string) (json.RawMessage, error) {
	resp, err := s.client.Do(ctx, url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("upstream status %d for %s", resp.StatusCode, url)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return body, nil
}
