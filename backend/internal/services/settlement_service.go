package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"superbet/backend/internal/config"
	"superbet/backend/internal/db"
	"superbet/backend/internal/httpclient"
	"superbet/backend/internal/models"
)

type SettlementService struct {
	cfg   *config.Config
	httpc *httpclient.Client
	db    *db.DB
}

func NewSettlementService(cfg *config.Config, httpc *httpclient.Client, database *db.DB) *SettlementService {
	return &SettlementService{
		cfg:   cfg,
		httpc: httpc,
		db:    database,
	}
}

// StartPolling inicia o loop que verifica as apostas pendentes.
func (s *SettlementService) StartPolling(ctx context.Context) {
	// Roda a cada 1 minuto
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		log.Println("Iniciando Settlement Engine (verificação de resultados)...")
		// Roda uma vez imediatamente
		s.RunSettlement(ctx)
		
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.RunSettlement(ctx)
			}
		}
	}()
}

func (s *SettlementService) RunSettlement(ctx context.Context) {
	tickets, err := s.db.GetPendingTickets()
	if err != nil {
		log.Printf("[Settlement] Erro ao buscar tickets pendentes: %v", err)
		return
	}

	if len(tickets) == 0 {
		return
	}

	// 1. Coletar IDs de eventos pendentes únicos que já começaram
	eventMap := make(map[int64]bool)
	now := time.Now()
	
	for _, t := range tickets {
		for _, sel := range t.Selections {
			if sel.Status == models.TicketStatusPending {
				// Verifica se o jogo já começou (ignora jogos futuros)
				if sel.StartTime != "" {
					if startTime, err := time.Parse(time.RFC3339, sel.StartTime); err == nil {
						// Se a hora atual ainda for anterior ao início do jogo, ignora este evento no momento
						if now.Before(startTime) {
							continue
						}
					}
				}
				eventMap[sel.EventID] = true
			}
		}
	}

	if len(eventMap) == 0 {
		return // Nenhum jogo pendente que já tenha começado
	}

	// 2. Buscar resultados da API para cada evento
	type OddsResult struct {
		UUID   string `json:"uuid"`
		Status string `json:"status"` // "win", "lost", "void", etc
	}

	eventResults := make(map[int64]map[string]string) // eventID -> selectionUUID -> status

	for eventID := range eventMap {
		url := fmt.Sprintf("%s/v2/pt-BR/events/%d?oddsResults=true", s.cfg.SuperbetBase, eventID)
		
		var raw json.RawMessage
		if err := s.httpc.GetJSON(ctx, url, &raw); err != nil {
			log.Printf("[Settlement] Erro ao buscar evento %d: %v", eventID, err)
			continue
		}

		var root struct {
			Data []struct {
				OddsResults []OddsResult `json:"oddsResults"`
			} `json:"data"`
		}

		if err := json.Unmarshal(raw, &root); err == nil && len(root.Data) > 0 && len(root.Data[0].OddsResults) > 0 {
			resMap := make(map[string]string)
			for _, r := range root.Data[0].OddsResults {
				resMap[r.UUID] = r.Status
			}
			eventResults[eventID] = resMap
		}
	}

	// 3. Avaliar as seleções e preparar os updates em lote
	var selectionsToUpdate []models.TicketSelection
	var ticketsToWin []models.Ticket
	var ticketsToLose []models.Ticket
	var ticketsToVoid []models.Ticket

	for _, t := range tickets {
		allSettled := true
		hasLost := false
		hasWon := false
		hasVoid := false

		for i, sel := range t.Selections {
			if sel.Status != models.TicketStatusPending {
				if sel.Status == models.TicketStatusLost { hasLost = true }
				if sel.Status == models.TicketStatusWon { hasWon = true }
				if sel.Status == models.TicketStatusVoid { hasVoid = true }
				continue
			}

			// Tenta achar o resultado
			if resMap, ok := eventResults[sel.EventID]; ok {
				if status, found := resMap[sel.SelectionID]; found {
					var newStatus models.TicketStatus
					if status == "win" {
						newStatus = models.TicketStatusWon
						hasWon = true
					} else if status == "lost" {
						newStatus = models.TicketStatusLost
						hasLost = true
					} else if status == "void" || status == "cancelled" || status == "postponed" {
						newStatus = models.TicketStatusVoid
						hasVoid = true
					} else {
						// Outro status desconhecido, ignorar por agora
						allSettled = false
						continue 
					}

					// Adiciona à lista de batch update
					t.Selections[i].Status = newStatus
					selectionsToUpdate = append(selectionsToUpdate, t.Selections[i])
				} else {
					allSettled = false // Resultado ainda não saiu para essa odd específica
				}
			} else {
				allSettled = false // Evento não retornou resultados ainda
			}
		}

		// 4. Se houver pelo menos um LOST, o bilhete está PERDIDO
		if hasLost && t.Status != models.TicketStatusLost {
			t.Status = models.TicketStatusLost
			ticketsToLose = append(ticketsToLose, t)
			continue
		}

		// 5. Se todos terminaram e não tem nenhum LOST
		if allSettled && !hasLost {
			if hasVoid {
				// Recalcular TotalOdds e PossibleWin
				newTotalOdds := 1.0
				allVoid := true
				for _, sel := range t.Selections {
					if sel.Status == models.TicketStatusWon {
						newTotalOdds *= sel.Odds
						allVoid = false
					} else if sel.Status == models.TicketStatusVoid {
						newTotalOdds *= 1.0 // Odd 1.0
					}
				}
				
				t.TotalOdds = newTotalOdds
				t.PossibleWin = t.Amount * newTotalOdds

				if allVoid {
					t.Status = models.TicketStatusVoid
					ticketsToVoid = append(ticketsToVoid, t)
				} else {
					t.Status = models.TicketStatusWon
					ticketsToWin = append(ticketsToWin, t)
				}
				
				// Atualiza os valores do ticket no banco imediatamente
				s.db.UpdateTicketOddsAndWin(context.Background(), t.ID, t.TotalOdds, t.PossibleWin)
			} else if hasWon {
				t.Status = models.TicketStatusWon
				ticketsToWin = append(ticketsToWin, t)
			}
		}
	}

	// 6. Executar updates no banco em LOTE (Batching) para máxima performance
	if len(selectionsToUpdate) > 0 {
		if err := s.db.UpdateSelectionStatusBatch(context.Background(), selectionsToUpdate); err != nil {
			log.Printf("[Settlement] Erro crítico no batch update de seleções: %v", err)
			return // Aborta para não pagar errado
		}
		log.Printf("[Settlement] Atualizou %d seleções", len(selectionsToUpdate))
	}

	if len(ticketsToLose) > 0 {
		if err := s.db.UpdateTicketStatusBatch(context.Background(), ticketsToLose); err != nil {
			log.Printf("[Settlement] Erro crítico no batch update de tickets perdidos: %v", err)
		} else {
			log.Printf("[Settlement] Liquidou %d bilhetes como PERDIDOS", len(ticketsToLose))
		}
	}

	if len(ticketsToWin) > 0 {
		if err := s.db.UpdateTicketStatusBatch(context.Background(), ticketsToWin); err != nil {
			log.Printf("[Settlement] Erro crítico no batch update de tickets ganhos: %v", err)
		} else {
			log.Printf("[Settlement] Liquidou %d bilhetes como GANHOS", len(ticketsToWin))
			// Pagar os prêmios 
			for _, t := range ticketsToWin {
				s.db.UpdateUserBalanceDirect(context.Background(), t.UserID, t.PossibleWin)
			}
		}
	}

	if len(ticketsToVoid) > 0 {
		if err := s.db.UpdateTicketStatusBatch(context.Background(), ticketsToVoid); err != nil {
			log.Printf("[Settlement] Erro crítico no batch update de tickets void: %v", err)
		} else {
			log.Printf("[Settlement] Liquidou %d bilhetes como ANULADOS (Reembolsados)", len(ticketsToVoid))
			// Reembolsar o amount
			for _, t := range ticketsToVoid {
				s.db.UpdateUserBalanceDirect(context.Background(), t.UserID, t.Amount)
			}
		}
	}
}
