package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"time"

	"superbet/backend/internal/cache"
	"superbet/backend/internal/config"
	"superbet/backend/internal/httpclient"
	"superbet/backend/internal/models"
)

// OddsBroadcaster envia atualizações de odds apenas para clientes que assinaram o evento.
type OddsBroadcaster interface {
	BroadcastOdds(eventID int64, msg []byte)
	ActiveEventIDs() []int64
}

type OddsService struct {
	cfg    *config.Config
	client *httpclient.Client
	cache  *cache.Cache[int64, []models.OddsMarket]
	hub    OddsBroadcaster
}

func NewOddsService(cfg *config.Config, c *httpclient.Client, cc *cache.Cache[int64, []models.OddsMarket], hub OddsBroadcaster) *OddsService {
	return &OddsService{cfg: cfg, client: c, cache: cc, hub: hub}
}

// GetEventOdds retorna odds do cache, ou busca da API externa se cache expirou.
func (s *OddsService) GetEventOdds(ctx context.Context, eventID int64) ([]models.OddsMarket, error) {
	if cached, ok := s.cache.Get(eventID); ok {
		return cached, nil
	}
	return s.RefreshEvent(ctx, eventID)
}

// RefreshEvent sempre consulta a API externa (ignora cache) e atualiza o cache.
func (s *OddsService) RefreshEvent(ctx context.Context, eventID int64) ([]models.OddsMarket, error) {
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

// StartEventPolling faz polling dos eventos que têm pelo menos 1 cliente
// conectado, e faz broadcast da atualização para os watchers daquele evento.
// O intervalo é controlado por CACHE_TTL_SECONDS no .env.
func (s *OddsService) StartEventPolling(ctx context.Context) {
	interval := s.cfg.CacheTTL
	go func() {
		log.Printf("Iniciando polling de odds (a cada %s)...", interval)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.refreshActiveEvents(ctx)
			}
		}
	}()
}

func (s *OddsService) refreshActiveEvents(ctx context.Context) {
	if s.hub == nil {
		return
	}
	ids := s.hub.ActiveEventIDs()
	if len(ids) == 0 {
		return
	}
	for _, eventID := range ids {
		reqCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		markets, err := s.RefreshEvent(reqCtx, eventID)
		cancel()
		if err != nil {
			log.Printf("Erro ao atualizar odds do evento %d: %v", eventID, err)
			continue
		}
		data, err := json.Marshal(markets)
		if err != nil {
			continue
		}
		msg := mustMarshal(models.ServerMessage{
			Type:    "ODDS_UPDATED",
			EventID: eventID,
			Data:    data,
		})
		s.hub.BroadcastOdds(eventID, msg)
	}
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
