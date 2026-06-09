package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"superbet/backend/internal/db"
	"superbet/backend/internal/models"
)

type BettingService struct {
	db   *db.DB
	odds *OddsService
}

func NewBettingService(database *db.DB, oddsService *OddsService) *BettingService {
	return &BettingService{db: database, odds: oddsService}
}

func (s *BettingService) PlaceBet(ctx context.Context, userID int64, amount float64, selections []models.TicketSelection, idempotencyKey string) (string, error) {
	if amount <= 0 {
		return "", errors.New("valor da aposta deve ser maior que zero")
	}

	totalOdds := 1.0
	for _, sel := range selections {
		if sel.Odds <= 1.0 {
			return "", errors.New("uma ou mais seleções possuem odds inválidas")
		}

		// Validação de Odds Alteradas (Odds Change Lock)
		liveMarkets, err := s.odds.GetEventOdds(ctx, sel.EventID)
		if err != nil {
			log.Printf("DEBUG: Error getting live odds for event %d: %v", sel.EventID, err)
		}

		if err == nil && len(liveMarkets) > 0 {
			found := false
			for _, m := range liveMarkets {
				if m.ID == sel.MarketID {
					for _, liveSel := range m.Selections {
						if liveSel.ID == sel.SelectionID {
							found = true
							if liveSel.Price <= 1.0 {
								return "", fmt.Errorf("a seleção '%s' (%s) foi bloqueada ou suspensa", sel.SelectionName, m.Name)
							}
							// Tolerância zero para queda de odd. Se a odd atual for menor, rejeita.
							if liveSel.Price < sel.Odds {
								return "", fmt.Errorf("a cotação para '%s' mudou (de %.2f para %.2f)", sel.SelectionName, sel.Odds, liveSel.Price)
							}
							break
						}
					}
					break
				}
			}
			if !found {
				log.Printf("DEBUG: Selection NOT FOUND. Wanted MarketID: %s, SelectionID: %s. Available markets: %d", sel.MarketID, sel.SelectionID, len(liveMarkets))
				return "", fmt.Errorf("a seleção '%s' não está mais disponível", sel.SelectionName)
			}
		} else if err == nil && len(liveMarkets) == 0 {
			log.Printf("DEBUG: No live markets found in cache for event %d", sel.EventID)
		}

		totalOdds *= sel.Odds
	}
	possibleWin := amount * totalOdds

	externalID, err := s.db.SaveTicket(ctx, userID, amount, totalOdds, possibleWin, selections, idempotencyKey)
	if err != nil {
		log.Printf("ERRO CRÍTICO AO SALVAR TICKET: %v", err)
		// Se falhou o UpdateUserBalance por causa do CHECK(balance >= 0), err terá essa info
		return "", errors.New("erro ao processar aposta: verifique seu saldo")
	}

	return externalID, nil
}

func (s *BettingService) GetDatabase() *db.DB {
	return s.db
}
