package main

import (
	"context"
	"fmt"
	"superbet/backend/internal/config"
	"superbet/backend/internal/httpclient"
	"superbet/backend/internal/models"
	"time"
)

func main() {
	cfg := &config.Config{
		SuperScoreBase: "https://api.content-prod.superscore.live",
		BookmakerID: "76",
		Language: "pt-BR",
		SportID: "1",
		TimezoneOffset: -3,
	}
	c := httpclient.New(time.Second * 10)
	
	key := time.Now().Format("2006-01-02")
	url := fmt.Sprintf(
		"%s/v2/public/stats/events/by-date/%s?language=%s&sport_id=%s&date=%s&timezone_offset=%d",
		cfg.SuperScoreBase,
		cfg.BookmakerID,
		cfg.Language,
		cfg.SportID,
		key,
		cfg.TimezoneOffset,
	)

	var resp models.RawMatchesResponse
	c.GetJSON(context.Background(), url, &resp)
	
	for _, comp := range resp.Competitions {
		for _, r := range comp.Matches {
			if m, ok := models.NormalizeMatch(r, comp.Competition.Name, "BR", "Category"); ok {
				fmt.Printf("Normalized: %+v\n", m)
			}
		}
	}
}
