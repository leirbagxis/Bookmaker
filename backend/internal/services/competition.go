package services

import (
	"sort"
	"strings"

	"superbet/backend/internal/models"
)

var allowedCompetitions = map[string]map[string]bool{
	"premier league":     {"GB": true, "ENG": true},
	"la liga":            {"ES": true},
	"primera división":   {"ES": true},
	"bundesliga":         {"DE": true},
	"serie a":            {"IT": true},
	"serie a italiana":   {"IT": true},
	"ligue 1":            {"FR": true},
	"brasileirão série a": {"BR": true, "BRA": true},
	"brasileirao serie a": {"BR": true, "BRA": true},
	"brasileirão serie a": {"BR": true, "BRA": true},
}

var priorities = map[string]int{
	"premier league":        1,
	"la liga":               2,
	"primera división":      2,
	"bundesliga":            3,
	"serie a":               4,
	"serie a italiana":      4,
	"ligue 1":               5,
	"brasileirão série a":   6,
	"brasileirao serie a":   6,
	"brasileirão serie a":   6,
}

func Priority(name string) int {
	key := strings.ToLower(strings.TrimSpace(name))
	if p, ok := priorities[key]; ok {
		return p
	}
	return 99
}

type CompetitionGroup struct {
	Name     string         `json:"name"`
	Priority int            `json:"priority"`
	Matches  []models.Match `json:"matches"`
}

func isAllowedCompetition(compName, country string) bool {
	key := strings.ToLower(strings.TrimSpace(compName))
	c := strings.ToUpper(strings.TrimSpace(country))
	allowedCountries, ok := allowedCompetitions[key]
	if !ok {
		return false
	}
	return allowedCountries[c]
}

func GroupMatches(matches []models.Match) []CompetitionGroup {
	groups := map[string]*CompetitionGroup{}
	order := []string{}
	for _, m := range matches {
		name := m.Competition
		if name == "" || !isAllowedCompetition(m.Competition, m.Country) {
			name = "Outros campeonatos"
		}
		
		if _, ok := groups[name]; !ok {
			groups[name] = &CompetitionGroup{
				Name:     name,
				Priority: Priority(name),
			}
			order = append(order, name)
		}
		groups[name].Matches = append(groups[name].Matches, m)
	}

	out := make([]CompetitionGroup, 0, len(groups))
	for _, name := range order {
		g := groups[name]
		sort.SliceStable(g.Matches, func(i, j int) bool {
			return g.Matches[i].StartTime < g.Matches[j].StartTime
		})
		out = append(out, *g)
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Priority != out[j].Priority {
			return out[i].Priority < out[j].Priority
		}
		return out[i].Name < out[j].Name
	})
	return out
}