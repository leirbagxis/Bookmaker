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
	if err := c.GetJSON(context.Background(), url, &resp); err != nil {
		fmt.Println("Err:", err)
		return
	}
	
	fmt.Printf("Parsed %d competitions\n", len(resp.Competitions))
	
	hasOdds := 0
	for _, comp := range resp.Competitions {
		for _, m := range comp.Matches {
			if len(m.Odds) > 0 {
				hasOdds++
				fmt.Printf("Match %s odds: %d, team1=%v, team2=%v\n", m.ID, len(m.Odds), m.Team1, m.Team2)
			}
		}
	}
	fmt.Printf("Total matches with odds: %d\n", hasOdds)
}
