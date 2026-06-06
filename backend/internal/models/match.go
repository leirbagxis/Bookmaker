package models

import (
	"encoding/json"
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
	ID       string       `json:"id"`
	Team1    *rawTeamObj  `json:"team1"`
	Team2    *rawTeamObj  `json:"team2"`
	Date     *rawMatchDate `json:"date"`
	Status   int          `json:"status"`
	State    int          `json:"state"`
	Odds     []RawOdd     `json:"odds"`
	Country  string       `json:"-"`
	Category string       `json:"-"`
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
	}, true
}