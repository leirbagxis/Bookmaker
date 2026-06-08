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
	Odds    json.RawMessage `json:"odds"`
	Markets json.RawMessage `json:"markets"`
	Groups  json.RawMessage `json:"groups"`
}

type OddsMarket struct {
	ID         string         `json:"id"`
	Name       string         `json:"name"`
	Selections []OddSelection `json:"selections"`
}

type OddSelection struct {
	ID         string  `json:"id"`
	EventID    int64   `json:"eventId"`
	MarketID   string  `json:"marketId"`
	MarketName string  `json:"marketName"`
	Name       string  `json:"name"`
	Price      float64 `json:"price"`
	HomeTeam   string  `json:"homeTeam,omitempty"`
	AwayTeam   string  `json:"awayTeam,omitempty"`
}

type rawOddsEntry struct {
	Price      float64         `json:"price"`
	Name       string          `json:"name"`
	OutcomeID  int64           `json:"outcomeId"`
	UUID       string          `json:"uuid"`
	EventID    int64           `json:"eventId"`
	ID         int64           `json:"id"`
	Market     json.RawMessage `json:"market"`
	MarketID   interface{}     `json:"marketId"`
	MarketName string          `json:"marketName"`
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

type rawEventEnvelope struct {
	Home         json.RawMessage `json:"home"`
	Away         json.RawMessage `json:"away"`
	HomeTeam     json.RawMessage `json:"home_team"`
	AwayTeam     json.RawMessage `json:"away_team"`
	HomeTeamName string          `json:"homeTeamName"`
	AwayTeamName string          `json:"awayTeamName"`
	MatchName    string          `json:"matchName"`
}

func NormalizeEventOdds(raw json.RawMessage) []OddsMarket {
	if len(raw) == 0 {
		return nil
	}

	// Tenta desempacotar se estiver no formato { "data": [...] } ou { "data": { ... } }
	var wrapped struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(raw, &wrapped); err == nil && len(wrapped.Data) > 0 {
		var arr []json.RawMessage
		if err := json.Unmarshal(wrapped.Data, &arr); err == nil && len(arr) > 0 {
			// Se for um array, pegamos o primeiro que tiver odds válidas
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

	// POOL ÚNICO: Coletar todas as odds de todos os lugares possíveis para evitar repetição
	allEntries := collectAllRawEntries(envelope, raw)
	
	if len(allEntries) == 0 {
		return nil
	}

	// Agrupar por marketName e remover duplicatas
	marketMap := make(map[string][]OddSelection)
	marketOrder := make([]string, 0)
	
	// Para cada marketName, manteremos um set de nomes de seleções para evitar duplicatas internas
	selectionSeen := make(map[string]map[string]bool)

	for _, e := range allEntries {
		mname := e.MarketName
		if mname == "" {
			mname = "Mercado Principal"
		}
		
		mid := fmt.Sprintf("%v", e.MarketID)
		if mid == "" || mid == "<nil>" {
			mid = strings.ToLower(strings.ReplaceAll(mname, " ", "_"))
		}

		sel := selectionFromRaw(e, eventID, mid, mname, home, away)
		// Alteração: Não ignoramos mais odds <= 1.0 na origem, 
		// enviamos para o frontend poder renderizar o cadeado (locked)
		// if sel.Price <= 1.0 { 
		// 	continue
		// }

		if _, ok := marketMap[mname]; !ok {
			marketMap[mname] = make([]OddSelection, 0)
			marketOrder = append(marketOrder, mname)
			selectionSeen[mname] = make(map[string]bool)
		}

		// Chave de unicidade da seleção dentro do mercado: nome
		selKey := sel.Name
		if !selectionSeen[mname][selKey] {
			marketMap[mname] = append(marketMap[mname], sel)
			selectionSeen[mname][selKey] = true
		}
	}

	out := make([]OddsMarket, 0, len(marketOrder))
	for _, name := range marketOrder {
		selections := marketMap[name]
		if len(selections) > 0 {
			out = append(out, OddsMarket{
				ID:         strings.ToLower(strings.ReplaceAll(name, " ", "_")),
				Name:       name,
				Selections: selections,
			})
		}
	}

	return out
}

func collectAllRawEntries(env RawEventOdds, raw json.RawMessage) []rawOddsEntry {
	var entries []rawOddsEntry

	// 1. Tentar do campo .Odds (que costuma ser a lista flat correta)
	if len(env.Odds) > 0 {
		var list []rawOddsEntry
		if err := json.Unmarshal(env.Odds, &list); err == nil && len(list) > 0 {
			entries = append(entries, list...)
		} else {
			var markets []rawMarket
			if err := json.Unmarshal(env.Odds, &markets); err == nil {
				for _, m := range markets {
					entries = append(entries, extractEntriesFromMarket(m)...)
				}
			}
		}
	}

	// 2. Se ainda estiver vazio, tentar de .Markets
	if len(entries) == 0 && len(env.Markets) > 0 {
		var markets []rawMarket
		if err := json.Unmarshal(env.Markets, &markets); err == nil {
			for _, m := range markets {
				entries = append(entries, extractEntriesFromMarket(m)...)
			}
		}
	}

	// 3. Fallback: tentar o root como lista de mercados
	if len(entries) == 0 {
		var rootMarkets []rawMarket
		if err := json.Unmarshal(raw, &rootMarkets); err == nil {
			for _, m := range rootMarkets {
				entries = append(entries, extractEntriesFromMarket(m)...)
			}
		}
	}

	return entries
}

func extractEntriesFromMarket(m rawMarket) []rawOddsEntry {
	var out []rawOddsEntry
	list := append(append([]rawOddsEntry{}, m.Odds...), m.Outcomes...)
	list = append(list, m.Selections...)
	
	for _, e := range list {
		if e.MarketName == "" {
			e.MarketName = m.Name
			if e.MarketName == "" {
				e.MarketName = m.Title
			}
		}
		if e.MarketID == nil {
			e.MarketID = m.ID
		}
		out = append(out, e)
	}
	return out
}

func collectMarkets(env RawEventOdds) []OddsMarket {
	var out []OddsMarket
	eventID := env.EventID
	if eventID == 0 {
		eventID = env.ID
	}
	home, away := extractEventTeamsFromEnvelope(env)

	addFromArray := func(arr []rawMarket) {
		for _, m := range arr {
			mk := marketFromRaw(m, eventID, home, away)
			if len(mk.Selections) > 0 {
				out = append(out, mk)
			}
		}
	}

	if len(env.Markets) > 0 {
		var arr []rawMarket
		if err := json.Unmarshal(env.Markets, &arr); err == nil {
			addFromArray(arr)
		}
		var single rawMarket
		if err := json.Unmarshal(env.Markets, &single); err == nil && (single.ID != "" || single.Name != "") {
			mk := marketFromRaw(single, eventID, home, away)
			if len(mk.Selections) > 0 {
				out = append(out, mk)
			}
		}
	}

	if len(env.Groups) > 0 {
		var groups []struct {
			Name    string      `json:"name"`
			ID      string      `json:"id"`
			Markets []rawMarket `json:"markets"`
		}
		_ = json.Unmarshal(env.Groups, &groups)
		for _, g := range groups {
			for _, m := range g.Markets {
				mk := marketFromRaw(m, eventID, home, away)
				if mk.Name == "" {
					mk.Name = g.Name
				}
				if len(mk.Selections) > 0 {
					out = append(out, mk)
				}
			}
		}
	}

	if len(env.Odds) > 0 {
		var arr []rawMarket
		if err := json.Unmarshal(env.Odds, &arr); err == nil {
			addFromArray(arr)
		} else {
			// Fallback: agrupar por marketName se for uma lista direta de odds
			var entries []rawOddsEntry
			if err := json.Unmarshal(env.Odds, &entries); err == nil && len(entries) > 0 {
				marketGroups := make(map[string][]OddSelection)
				marketNames := make(map[string]string)
				
				for _, e := range entries {
					mname := e.MarketName
					if mname == "" {
						mname = "Mercado Principal"
					}
					mid := fmt.Sprintf("%v", e.MarketID)
					if mid == "" || mid == "<nil>" {
						mid = strings.ToLower(strings.ReplaceAll(mname, " ", "_"))
					}
					
					sel := selectionFromRaw(e, eventID, mid, mname, home, away)
					if sel.Price > 0 {
						marketGroups[mid] = append(marketGroups[mid], sel)
						marketNames[mid] = mname
					}
				}
				
				for mid, selections := range marketGroups {
					out = append(out, OddsMarket{
						ID:         mid,
						Name:       marketNames[mid],
						Selections: selections,
					})
				}
			}
		}
	}

	return out
}

func marketFromRaw(m rawMarket, eventID int64, home, away string) OddsMarket {
	name := m.Name
	if name == "" {
		name = m.Title
	}
	if name == "" {
		name = m.Type
	}

	entries := append(append([]rawOddsEntry{}, m.Odds...), m.Outcomes...)
	entries = append(entries, m.Selections...)

	// Se ainda estiver sem nome, tenta pegar das seleções
	if name == "" && len(entries) > 0 {
		for _, e := range entries {
			if e.MarketName != "" {
				name = e.MarketName
				break
			}
		}
	}

	id := fmt.Sprintf("%v", m.ID)
	if id == "" || id == "<nil>" {
		id = strings.ToLower(strings.ReplaceAll(name, " ", "_"))
	}

	selections := make([]OddSelection, 0, len(entries))
	seen := make(map[string]bool)
	for _, e := range entries {
		sel := selectionFromRaw(e, eventID, id, name, home, away)
		if sel.Price <= 0 {
			continue
		}
		key := sel.ID
		if key == "" {
			key = fmt.Sprintf("%s|%s|%.4f", id, sel.Name, sel.Price)
		}
		if seen[key] {
			continue
		}
		seen[key] = true
		selections = append(selections, sel)
	}

	return OddsMarket{
		ID:         id,
		Name:       name,
		Selections: selections,
	}
}

func selectionFromRaw(e rawOddsEntry, eventID int64, marketID, marketName, home, away string) OddSelection {
	if e.EventID != 0 && eventID == 0 {
		eventID = e.EventID
	}
	id := e.UUID
	if id == "" {
		id = fmt.Sprintf("%d", e.OutcomeID)
		if id == "0" {
			id = fmt.Sprintf("%d", e.ID)
		}
	}
	mid := fmt.Sprintf("%v", e.MarketID)
	if mid == "" || mid == "<nil>" {
		mid = marketID
	}
	mname := e.MarketName
	if mname == "" {
		mname = marketName
	}
	return OddSelection{
		ID:         id,
		EventID:    eventID,
		MarketID:   mid,
		MarketName: mname,
		Name:       e.Name,
		Price:      e.Price,
		HomeTeam:   home,
		AwayTeam:   away,
	}
}

func extractEventTeamsFromEnvelope(env RawEventOdds) (string, string) {
	if len(env.Event) > 0 {
		return extractEventTeams(env.Event)
	}
	return "", ""
}

func extractEventTeams(raw json.RawMessage) (string, string) {
	var env rawEventEnvelope
	if err := json.Unmarshal(raw, &env); err != nil {
		return "", ""
	}
	home := env.HomeTeamName
	if home == "" {
		home = extractTeamName(env.Home)
	}
	if home == "" {
		home = extractTeamName(env.HomeTeam)
	}

	away := env.AwayTeamName
	if away == "" {
		away = extractTeamName(env.Away)
	}
	if away == "" {
		away = extractTeamName(env.AwayTeam)
	}

	if (home == "" || away == "") && env.MatchName != "" {
		parts := strings.Split(env.MatchName, " vs ")
		if len(parts) == 2 {
			if home == "" {
				home = strings.TrimSpace(parts[0])
			}
			if away == "" {
				away = strings.TrimSpace(parts[1])
			}
		} else {
			parts = strings.Split(env.MatchName, " - ")
			if len(parts) == 2 {
				if home == "" {
					home = strings.TrimSpace(parts[0])
				}
				if away == "" {
					away = strings.TrimSpace(parts[1])
				}
			}
		}
	}

	return home, away
}
