package services

import (
	"sort"
	"strings"

	"superbet/backend/internal/models"
)

var priorities = map[string]int{
	"copa do brasil":         1,
	"libertadores":           2,
	"brasileirão série a":   3,
	"brasileirao serie a":    3,
	"brasileirão serie a":    3,
	"brasileirão série b":   4,
	"brasileirao serie b":    4,
	"brasileirão serie b":    4,
	"premier league":        5,
	"la liga":               6,
	"serie a italiana":      7,
	"serie a":               7,
	"bundesliga":            8,
	"ligue 1":               9,
	"champions league":      10,
	"uefa champions league": 10,
	"europa league":         11,
	"uefa europa league":    11,
	"copa do mundo":         12,
	"world cup":             12,
	"amistosos":             13,
	"amistoso":              13,
	"friendlies":            13,
}

func Priority(name string) int {
	if p, ok := priorities[strings.ToLower(strings.TrimSpace(name))]; ok {
		return p
	}
	return 99
}

type CompetitionGroup struct {
	Name     string         `json:"name"`
	Priority int            `json:"priority"`
	Matches  []models.Match `json:"matches"`
}

func GroupMatches(matches []models.Match) []CompetitionGroup {
	groups := map[string]*CompetitionGroup{}
	order := []string{}
	for _, m := range matches {
		name := m.Competition
		if name == "" {
			name = "Outros"
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
