package main

import (
	"context"
	"encoding/json"
	"fmt"
	"superbet/backend/internal/httpclient"
	"time"
)

func main() {
	eventID := "13454908"
	url := fmt.Sprintf("https://production-superbet-offer-br.freetls.fastly.net/v2/pt-BR/events/%s?oddsResults=true", eventID)

	c := httpclient.New(time.Second * 10)
	var raw json.RawMessage
	if err := c.GetJSON(context.Background(), url, &raw); err != nil {
		fmt.Println("Erro ao buscar:", err)
		return
	}

	var root struct {
		Data []struct {
			OddsResults []struct {
				UUID     string `json:"uuid"`
				Status   string `json:"status"`
				OutcomeID int64 `json:"outcomeId"`
				MarketID int64 `json:"marketId"`
			} `json:"oddsResults"`
		} `json:"data"`
	}

	if err := json.Unmarshal(raw, &root); err != nil {
		fmt.Println("Erro unmarshal:", err)
		return
	}

	if len(root.Data) > 0 && len(root.Data[0].OddsResults) > 0 {
		fmt.Printf("Encontrados %d resultados de odds.\n", len(root.Data[0].OddsResults))
		for i, res := range root.Data[0].OddsResults {
			if i < 5 {
				fmt.Printf("- UUID: %s | OutcomeID: %d | MarketID: %d | Status: %s\n", res.UUID, res.OutcomeID, res.MarketID, res.Status)
			}
		}
	} else {
		fmt.Println("Nenhum oddsResults encontrado no array primário.")
	}
}
