package services

import (
	"context"
	"errors"
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

func (s *BettingService) PlaceBet(ctx context.Context, userID int64, amount float64, selections []models.TicketSelection) (string, error) {
	if amount <= 0 {
		return "", errors.New("valor da aposta deve ser maior que zero")
	}

	totalOdds := 1.0
	for _, sel := range selections {
		if sel.Odds <= 1.0 {
			return "", errors.New("uma ou mais seleções possuem odds inválidas")
		}
		totalOdds *= sel.Odds
	}
	possibleWin := amount * totalOdds

	externalID, err := s.db.SaveTicket(userID, amount, totalOdds, possibleWin, selections)
	if err != nil {
		log.Printf("ERRO CRÍTICO AO SALVAR TICKET: %v", err)
		// Se falhou o UpdateUserBalance por causa do CHECK(balance >= 0), err terá essa info
		return "", errors.New("erro ao processar aposta: verifique seu saldo")
	}

	return externalID, nil
}
