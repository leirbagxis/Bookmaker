package models

import (
	"encoding/json"
	"fmt"
	"strings"
)

type RawEventOdds struct {
	EventID int64           `json:"eventId"`
	ID      int64           `json:"id"`
	Event   json.RawMessage `json:"event"`
	Markets []rawMarket     `json:"markets"`
}

type rawMarket struct {
	ID         interface{}     `json:"id"`
	Name       string          `json:"name"`
	Title      string          `json:"title"`
	Type       string          `json:"type"`
	Odds       []rawOddsEntry  `json:"odds"`
	Outcomes   []rawOddsEntry  `json:"outcomes"`
	Selections []rawOddsEntry  `json:"selections"`
}

type rawOddsEntry struct {
	ID          int64   `json:"id"`
	UUID        string  `json:"uuid"`
	OutcomeID   int64   `json:"outcomeId"`
	MarketID    int64   `json:"marketId"`
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	MarketName  string  `json:"marketName"`
	EventID     int64   `json:"eventId"`
	Status      string  `json:"status"`
	SpecialBetV string  `json:"specialBetValue"`
}

type OddsMarket struct {
	ID         string         `json:"id"`
	Name       string         `json:"name"`
	Selections []OddSelection `json:"selections"`
}

type OddSelection struct {
	ID            string       `json:"id"`
	EventID       int64        `json:"eventId"`
	HomeTeam      string       `json:"homeTeam"`
	AwayTeam      string       `json:"awayTeam"`
	StartTime     string       `json:"startTime"`
	MarketID      string       `json:"marketId"`
	MarketName    string       `json:"marketName"`
	Name          string       `json:"name"`
	Price         float64      `json:"price"`
	Status        TicketStatus `json:"status"`
}

func NormalizeEventOdds(raw json.RawMessage) []OddsMarket {
	if len(raw) == 0 {
		return nil
	}

	// 1. Tentar desempacotar formato { "data": [...] }
	var wrapped struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(raw, &wrapped); err == nil && len(wrapped.Data) > 0 {
		var arr []json.RawMessage
		if err := json.Unmarshal(wrapped.Data, &arr); err == nil && len(arr) > 0 {
			for _, item := range arr {
				m := normalizeSingleRoot(item)
				if len(m) > 0 {
					return m
				}
			}
		}
		m := normalizeSingleRoot(wrapped.Data)
		if len(m) > 0 {
			return m
		}
	}

	return normalizeSingleRoot(raw)
}

func normalizeSingleRoot(raw json.RawMessage) []OddsMarket {
	var envelope RawEventOdds
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return nil
	}

	eventID := envelope.EventID
	if eventID == 0 {
		eventID = envelope.ID
	}

	home, away := extractEventTeams(raw)

	// Tentar coletar TODAS as entradas de odds de todas as fontes possíveis no JSON
	allEntries := collectAllRawEntries(envelope, raw)
	if len(allEntries) > 0 {
		return groupByMarket(allEntries, eventID, home, away)
	}

	return nil
}

// groupByMarket é o coração da normalização. Garante que IDs sejam consistentes.
func groupByMarket(entries []rawOddsEntry, eventID int64, home, away string) []OddsMarket {
	marketMap := make(map[string][]OddSelection)
	marketOrder := make([]string, 0)
	// Para cada marketName, manteremos um set de nomes de seleções para evitar duplicatas internas
	selectionSeen := make(map[string]map[string]bool)

	for _, e := range entries {
		mname := e.MarketName
		if mname == "" {
			mname = "Mercado Principal"
		}
		
		// GERAÇÃO DE MARKET ID CONSISTENTE
		mid := fmt.Sprintf("%v", e.MarketID)
		if mid == "" || mid == "0" || mid == "<nil>" {
			// Fallback determinístico baseado no nome
			mid = strings.ToLower(strings.ReplaceAll(mname, " ", "_"))
		}

		sel := selectionFromRaw(e, eventID, mid, mname, home, away)
		
		if _, ok := marketMap[mname]; !ok {
			marketMap[mname] = make([]OddSelection, 0)
			marketOrder = append(marketOrder, mname)
			selectionSeen[mname] = make(map[string]bool)
		}

		selKey := sel.Name
		if !selectionSeen[mname][selKey] {
			// Sincroniza o MarketID da seleção com o do grupo
			sel.MarketID = mid
			marketMap[mname] = append(marketMap[mname], sel)
			selectionSeen[mname][selKey] = true
		}
	}

	out := make([]OddsMarket, 0, len(marketOrder))
	for _, mname := range marketOrder {
		if len(marketMap[mname]) == 0 { continue }
		
		out = append(out, OddsMarket{
			ID:         marketMap[mname][0].MarketID,
			Name:       mname,
			Selections: marketMap[mname],
		})
	}
	return out
}

func collectAllRawEntries(envelope RawEventOdds, raw json.RawMessage) []rawOddsEntry {
	var all []rawOddsEntry

	// 1. Do array principal "odds"
	var root struct {
		Odds []rawOddsEntry `json:"odds"`
	}
	if err := json.Unmarshal(raw, &root); err == nil {
		all = append(all, root.Odds...)
	}

	// 2. De dentro dos "markets"
	for _, m := range envelope.Markets {
		entries := append(append([]rawOddsEntry{}, m.Odds...), m.Outcomes...)
		entries = append(entries, m.Selections...)
		
		// Injeta os dados do market pai nas entradas APENAS se estiverem vazios
		mID, _ := parseID(m.ID)
		parentMName := m.Name
		if parentMName == "" {
			parentMName = m.Title
		}

		for i := range entries {
			if entries[i].MarketID == 0 {
				entries[i].MarketID = int64(mID)
			}
			// CORREÇÃO: Não sobrescrever se a entrada já tiver um nome de mercado específico
			if entries[i].MarketName == "" {
				entries[i].MarketName = parentMName
			}
		}
		all = append(all, entries...)
	}

	return all
}

func selectionFromRaw(e rawOddsEntry, eventID int64, marketID, marketName, home, away string) OddSelection {
	if e.EventID != 0 && eventID == 0 {
		eventID = e.EventID
	}
	
	// GERAÇÃO DE SELECTION ID CONSISTENTE
	id := e.UUID
	if id == "" {
		if e.OutcomeID != 0 {
			id = fmt.Sprintf("%d", e.OutcomeID)
		} else if e.ID != 0 {
			id = fmt.Sprintf("%d", e.ID)
		} else {
			// Fallback extremo
			id = strings.ToLower(strings.ReplaceAll(e.Name, " ", "_"))
		}
	}

	mname := marketName
	if e.MarketName != "" {
		mname = e.MarketName
	}
	
	// Fallback inteligente para quando o nome do mercado some (comum em V2)
	if mname == "" || mname == "Mercado Principal" {
		if strings.Contains(strings.ToLower(e.Name), "escanteio") || strings.Contains(strings.ToLower(e.Name), "corner") {
			mname = "Total de Escanteios"
		} else if strings.Contains(strings.ToLower(e.Name), "cartao") || strings.Contains(strings.ToLower(e.Name), "cartão") {
			mname = "Total de Cartões"
		}
	}

	return OddSelection{
		ID:         id,
		EventID:    eventID,
		MarketID:   marketID,
		MarketName: mname,
		Name:       e.Name,
		Price:      e.Price,
		HomeTeam:   home,
		AwayTeam:   away,
	}
}

func extractEventTeams(raw json.RawMessage) (string, string) {
	var env struct {
		Event struct {
			HomeTeam string `json:"homeTeamName"`
			AwayTeam string `json:"awayTeamName"`
			Match    string `json:"matchName"`
		} `json:"event"`
		MatchName string `json:"matchName"`
		HomeTeam  string `json:"homeTeamName"`
		AwayTeam  string `json:"awayTeamName"`
	}

	if err := json.Unmarshal(raw, &env); err == nil {
		home := env.Event.HomeTeam
		if home == "" { home = env.HomeTeam }
		
		away := env.Event.AwayTeam
		if away == "" { away = env.AwayTeam }

		if home != "" && away != "" {
			return home, away
		}

		mName := env.Event.Match
		if mName == "" { mName = env.MatchName }

		if mName != "" {
			parts := strings.Split(mName, "·")
			if len(parts) == 0 { parts = strings.Split(mName, " - ") }
			if len(parts) >= 2 {
				return strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])
			}
		}
	}
	return "", ""
}

func parseID(val interface{}) (int, bool) {
	switch x := val.(type) {
	case float64:
		return int(x), true
	case int:
		return x, true
	case int64:
		return int(x), true
	case string:
		var n int
		if _, err := fmt.Sscanf(x, "%d", &n); err == nil {
			return n, true
		}
	}
	return 0, false
}
