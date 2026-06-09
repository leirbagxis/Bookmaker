package models

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type RawOdd struct {
	Price     float64 `json:"price"`
	Name      string  `json:"name"`
	OutcomeID int64   `json:"outcome_id"`
	UUID      string  `json:"uuid"`
	EventID   int64   `json:"event_id"`
}

type rawMatchDate struct {
	Seconds int64 `json:"seconds"`
	Nanos   int   `json:"nanos"`
}

type rawTeamObj struct {
	Name      string `json:"name"`
	ShortName string `json:"short_name"`
	FullName  string `json:"full_name"`
}

type rawCountryCode struct {
	Value string `json:"value"`
}

type RawMatch struct {
	ID          string          `json:"id"`
	Team1       *rawTeamObj     `json:"team1"`
	Team2       *rawTeamObj     `json:"team2"`
	Date        *rawMatchDate   `json:"date"`
	Status      int             `json:"status"`
	State       int             `json:"state"`
	Odds        []RawOdd        `json:"odds"`
	Country     string          `json:"-"`
	Category    string          `json:"-"`
	LiveMinute  json.RawMessage `json:"live_minute"`
	Clock       json.RawMessage `json:"clock"`
	Scores      json.RawMessage `json:"scores"`
	LeadingTeam json.RawMessage `json:"leading_team"`
}

type rawScoreEntry struct {
	Score       float64 `json:"score"`
	TeamID      *string `json:"team_id,omitempty"`
	Display     *string `json:"display,omitempty"`
	PeriodScore *string `json:"period_score,omitempty"`
}

type RawCompetitionEnvelope struct {
	Competition struct {
		Name        string         `json:"name"`
		CountryCode rawCountryCode `json:"country_code"`
	} `json:"competition"`
	Category struct {
		Name        string         `json:"name"`
		CountryCode rawCountryCode `json:"country_code"`
	} `json:"category"`
	Matches []RawMatch `json:"matches"`
}

type RawMatchesResponse struct {
	Competitions []RawCompetitionEnvelope `json:"competitions"`
}

type Match struct {
	EventID     int64   `json:"eventId"`
	HomeTeam    string  `json:"homeTeam"`
	AwayTeam    string  `json:"awayTeam"`
	Competition string  `json:"competition"`
	StartTime   string  `json:"startTime"`
	Status      string  `json:"status,omitempty"`
	HomeOdd     float64 `json:"homeOdd"`
	DrawOdd     float64 `json:"drawOdd"`
	AwayOdd     float64 `json:"awayOdd"`
	Country     string  `json:"country,omitempty"`
	Category    string  `json:"category,omitempty"`
	HomeScore   *int    `json:"homeScore,omitempty"`
	AwayScore   *int    `json:"awayScore,omitempty"`
	LiveMinute  *int    `json:"liveMinute,omitempty"`
	Clock       string  `json:"clock,omitempty"`
}

func extractTeamFromObj(obj *rawTeamObj) string {
	if obj == nil {
		return ""
	}
	if obj.Name != "" {
		return obj.Name
	}
	if obj.ShortName != "" {
		return obj.ShortName
	}
	if obj.FullName != "" {
		return obj.FullName
	}
	return ""
}

func extractTeamName(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return s
	}
	var t struct {
		Name      string `json:"name"`
		ShortName string `json:"short_name"`
		FullName  string `json:"full_name"`
		Title     string `json:"title"`
	}
	if err := json.Unmarshal(raw, &t); err == nil {
		if t.Name != "" {
			return t.Name
		}
		if t.ShortName != "" {
			return t.ShortName
		}
		if t.FullName != "" {
			return t.FullName
		}
		if t.Title != "" {
			return t.Title
		}
	}
	return ""
}

func NormalizeMatch(r RawMatch, competitionName, country, category string) (Match, bool) {
	if len(r.Odds) == 0 {
		return Match{}, false
	}

	home := extractTeamFromObj(r.Team1)
	away := extractTeamFromObj(r.Team2)
	if home == "" || away == "" {
		return Match{}, false
	}

	var homeOdd, drawOdd, awayOdd float64
	hasHome, hasDraw, hasAway := false, false, false
	var eventID int64
	for _, o := range r.Odds {
		if eventID == 0 && o.EventID != 0 {
			eventID = o.EventID
		}
		switch o.Name {
		case "1":
			homeOdd = o.Price
			hasHome = true
		case "X":
			drawOdd = o.Price
			hasDraw = true
		case "2":
			awayOdd = o.Price
			hasAway = true
		}
	}
	if !hasHome || !hasDraw || !hasAway {
		return Match{}, false
	}
	if eventID == 0 {
		return Match{}, false
	}

	var startTime string
	if r.Date != nil && r.Date.Seconds > 0 {
		startTime = time.Unix(r.Date.Seconds, 0).UTC().Format(time.RFC3339)
	}

	var status string
	switch r.State {
	case 1:
		status = "LIVE"
	case 2:
		status = "FT"
	default:
		status = ""
	}

	comp := strings.TrimSpace(competitionName)

	var homeScore, awayScore *int
	scores := parseScores(r.Scores)
	if len(scores) >= 2 {
		v0 := scores[0]
		homeScore = &v0
		v1 := scores[1]
		awayScore = &v1
	} else {
		for _, s := range scores {
			v := s
			if homeScore == nil {
				homeScore = &v
				continue
			}
			if awayScore == nil {
				awayScore = &v
				break
			}
		}
	}

	return Match{
		EventID:     eventID,
		HomeTeam:    home,
		AwayTeam:    away,
		Competition: comp,
		StartTime:   startTime,
		Status:      status,
		HomeOdd:     homeOdd,
		DrawOdd:     drawOdd,
		AwayOdd:     awayOdd,
		Country:     strings.ToUpper(strings.TrimSpace(country)),
		Category:    strings.TrimSpace(category),
		HomeScore:   homeScore,
		AwayScore:   awayScore,
		LiveMinute:  parseIntPtr(r.LiveMinute),
		Clock:       parseString(r.Clock),
	}, true
}

func parseIntPtr(raw json.RawMessage) *int {
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	var n int
	if err := json.Unmarshal(raw, &n); err == nil {
		return &n
	}
	return nil
}

func parseString(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return s
	}
	// Fallback: se vier número, converte para string
	var n json.Number
	if err := json.Unmarshal(raw, &n); err == nil {
		return n.String()
	}
	return ""
}

// parseScores converte o JSON bruto de "scores" em uma lista de inteiros.
// Aceita diferentes formatos observados na API: array de objetos, array de
// strings ("1", "2") ou array de números ([1, 2]).
func parseScores(raw json.RawMessage) []int {
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	// Tentativa 1: array de objetos com campos como team1/team2/score/display/period_score
	var entries []map[string]interface{}
	if err := json.Unmarshal(raw, &entries); err == nil && len(entries) > 0 {
		// Procurar o entry com type=0 (placar atual / full time)
		for _, e := range entries {
			typeVal, _ := e["type"]
			isCurrent := false
			if t, ok := toInt(typeVal); ok && t == 0 {
				isCurrent = true
			}
			if !isCurrent && len(entries) == 1 {
				isCurrent = true
			}
			if !isCurrent {
				continue
			}
			if v1, ok := e["team1"]; ok {
				if n, ok := toInt(v1); ok {
					out := []int{n}
					if v2, ok := e["team2"]; ok {
						if n2, ok := toInt(v2); ok {
							out = append(out, n2)
							return out
						}
					}
				}
			}
		}
		// Fallback: tentar extrair de qualquer campo
		for _, e := range entries {
			for _, key := range []string{"display", "period_score", "score"} {
				if v, ok := e[key]; ok {
					if n, ok := toInt(v); ok {
						return []int{n}
					}
				}
			}
		}
	}
	// Tentativa 2: array de strings
	var strs []string
	if err := json.Unmarshal(raw, &strs); err == nil {
		out := make([]int, 0, len(strs))
		for _, s := range strs {
			if n, ok := toInt(s); ok {
				out = append(out, n)
			}
		}
		return out
	}
	// Tentativa 3: array de números
	var nums []int
	if err := json.Unmarshal(raw, &nums); err == nil {
		return nums
	}
	// Tentativa 4: array de floats
	var floats []float64
	if err := json.Unmarshal(raw, &floats); err == nil {
		out := make([]int, 0, len(floats))
		for _, f := range floats {
			out = append(out, int(f))
		}
		return out
	}
	return nil
}

func toInt(v interface{}) (int, bool) {
	switch x := v.(type) {
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