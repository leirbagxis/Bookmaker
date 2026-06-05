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
	Price     float64       `json:"price"`
	Name      string        `json:"name"`
	OutcomeID int64         `json:"outcome_id"`
	UUID      string        `json:"uuid"`
	EventID   int64         `json:"event_id"`
	ID        int64         `json:"id"`
	Market    json.RawMessage `json:"market"`
	MarketID  string        `json:"market_id"`
	MarketName string       `json:"market_name"`
}

type rawMarket struct {
	ID         string          `json:"id"`
	Name       string          `json:"name"`
	Title      string          `json:"title"`
	Type       string          `json:"type"`
	Odds       []rawOddsEntry  `json:"odds"`
	Outcomes   []rawOddsEntry  `json:"outcomes"`
	Selections []rawOddsEntry  `json:"selections"`
}

type rawEventEnvelope struct {
	Home     json.RawMessage `json:"home"`
	Away     json.RawMessage `json:"away"`
	HomeTeam json.RawMessage `json:"home_team"`
	AwayTeam json.RawMessage `json:"away_team"`
}

func NormalizeEventOdds(raw json.RawMessage) []OddsMarket {
	if len(raw) == 0 {
		return nil
	}

	var envelope RawEventOdds
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return nil
	}

	eventID := envelope.EventID
	if eventID == 0 {
		eventID = envelope.ID
	}

	home, away := extractEventTeams(raw)

	markets := collectMarkets(envelope)

	if len(markets) == 0 {
		var listMarkets []rawMarket
		_ = json.Unmarshal(raw, &listMarkets)
		for _, m := range listMarkets {
			mk := marketFromRaw(m, eventID, home, away)
			if len(mk.Selections) > 0 {
				markets = append(markets, mk)
			}
		}
	}

	if len(markets) == 0 {
		var flat struct {
			Odds      []rawOddsEntry `json:"odds"`
			Outcomes  []rawOddsEntry `json:"outcomes"`
		}
		_ = json.Unmarshal(raw, &flat)
		entries := append(append([]rawOddsEntry{}, flat.Odds...), flat.Outcomes...)
		if len(entries) > 0 {
			mk := OddsMarket{
				ID:   "1",
				Name: "Mercados",
			}
			for _, e := range entries {
				sel := selectionFromRaw(e, eventID, mk.ID, mk.Name, home, away)
				if sel.Price > 0 {
					mk.Selections = append(mk.Selections, sel)
				}
			}
			if len(mk.Selections) > 0 {
				markets = append(markets, mk)
			}
		}
	}

	return markets
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
		if err := json.Unmarshal(env.Markets, &single); err == nil && single.ID != "" {
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
	id := m.ID
	if id == "" {
		id = strings.ToLower(strings.ReplaceAll(name, " ", "_"))
	}

	entries := append(append([]rawOddsEntry{}, m.Odds...), m.Outcomes...)
	entries = append(entries, m.Selections...)

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
	mid := e.MarketID
	if mid == "" {
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
	home := extractTeamName(env.Home)
	if home == "" {
		home = extractTeamName(env.HomeTeam)
	}
	away := extractTeamName(env.Away)
	if away == "" {
		away = extractTeamName(env.AwayTeam)
	}
	return home, away
}
