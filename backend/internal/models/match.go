package models

import "encoding/json"

type RawOdd struct {
	Price     float64 `json:"price"`
	Name      string  `json:"name"`
	OutcomeID int64   `json:"outcome_id"`
	UUID      string  `json:"uuid"`
	EventID   int64   `json:"event_id"`
}

type RawMatch struct {
	EventID     int64           `json:"event_id"`
	Home        json.RawMessage `json:"home"`
	HomeTeam    json.RawMessage `json:"home_team"`
	Away        json.RawMessage `json:"away"`
	AwayTeam    json.RawMessage `json:"away_team"`
	Competition json.RawMessage `json:"competition"`
	Tournament  json.RawMessage `json:"tournament"`
	StartTime   string          `json:"start_time"`
	StartsAt    string          `json:"starts_at"`
	Kickoff     string          `json:"kickoff"`
	Status      string          `json:"status"`
	State       string          `json:"state"`
	Score       json.RawMessage `json:"score"`
	Odds        []RawOdd        `json:"odds"`
}

type RawMatchesResponse struct {
	Matches []RawMatch `json:"matches"`
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

func extractCompetitionName(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return s
	}
	var t struct {
		Name        string `json:"name"`
		Title       string `json:"title"`
		DisplayName string `json:"display_name"`
		Tournament  string `json:"tournament"`
	}
	if err := json.Unmarshal(raw, &t); err == nil {
		if t.Name != "" {
			return t.Name
		}
		if t.Title != "" {
			return t.Title
		}
		if t.DisplayName != "" {
			return t.DisplayName
		}
		if t.Tournament != "" {
			return t.Tournament
		}
	}
	return ""
}

func NormalizeMatch(r RawMatch) (Match, bool) {
	if r.EventID == 0 {
		return Match{}, false
	}

	home := extractTeamName(r.Home)
	if home == "" {
		home = extractTeamName(r.HomeTeam)
	}
	away := extractTeamName(r.Away)
	if away == "" {
		away = extractTeamName(r.AwayTeam)
	}
	if home == "" || away == "" {
		return Match{}, false
	}

	if len(r.Odds) == 0 {
		return Match{}, false
	}

	var homeOdd, drawOdd, awayOdd float64
	hasHome, hasDraw, hasAway := false, false, false
	for _, o := range r.Odds {
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

	comp := extractCompetitionName(r.Competition)
	if comp == "" {
		comp = extractCompetitionName(r.Tournament)
	}

	start := r.StartTime
	if start == "" {
		start = r.StartsAt
	}
	if start == "" {
		start = r.Kickoff
	}

	status := r.Status
	if status == "" {
		status = r.State
	}

	return Match{
		EventID:     r.EventID,
		HomeTeam:    home,
		AwayTeam:    away,
		Competition: comp,
		StartTime:   start,
		Status:      status,
		HomeOdd:     homeOdd,
		DrawOdd:     drawOdd,
		AwayOdd:     awayOdd,
	}, true
}
