package services

import (
	"sort"
	"strings"

	"superbet/backend/internal/models"
)

var allowedCompetitions = map[string]map[string]bool{
	"brasileirão série a": {"BR": true, "BRA": true},
	"brasileirao serie a": {"BR": true, "BRA": true},
	"brasileirão série b": {"BR": true, "BRA": true},
	"brasileirao serie b": {"BR": true, "BRA": true},
	"premier league":      {"GB": true, "ENG": true},
	"la liga":             {"ES": true},
	"primera división":    {"ES": true},
	"serie a italiana":    {"IT": true},
	"serie a":             {"IT": true},
	"bundesliga":          {"DE": true},
	"ligue 1":             {"FR": true},
	"copa do brasil":      {"BR": true, "BRA": true},
	"libertadores":        {"*": true},
	"champions league":    {"*": true},
	"europa league":       {"*": true},
	"copa do mundo":       {"*": true},
}

var priorities = map[string]int{
	"brasileirão série a": 1,
	"brasileirão série b": 2,
	"copa do brasil":      3,
	"libertadores":        4,
	"premier league":      5,
	"la liga":             6,
	"serie a italiana":    7,
	"bundesliga":          8,
	"ligue 1":             9,
	"champions league":    10,
	"europa league":       11,
	"copa do mundo":       12,
	"amistosos":           13,
}

func getStandardNameAndPriority(compName, country string) (string, int, bool) {
	c := strings.ToUpper(strings.TrimSpace(country))
	n := strings.ToLower(strings.TrimSpace(compName))

	// 1. Brasileirão Série A
	if (c == "BR" || c == "BRA") && (strings.Contains(n, "serie a") || strings.Contains(n, "série a")) {
		return "Brasileirão Série A", priorities["brasileirão série a"], true
	}
	// 2. Brasileirão Série B
	if (c == "BR" || c == "BRA") && (strings.Contains(n, "serie b") || strings.Contains(n, "série b")) {
		return "Brasileirão Série B", priorities["brasileirão série b"], true
	}
	// 3. Copa do Brasil
	if (c == "BR" || c == "BRA") && strings.Contains(n, "copa do brasil") {
		return "Copa do Brasil", priorities["copa do brasil"], true
	}
	// 4. Libertadores
	if strings.Contains(n, "libertadores") {
		return "Libertadores", priorities["libertadores"], true
	}
	// 5. Premier League
	if (c == "GB" || c == "ENG") && strings.Contains(n, "premier league") {
		return "Premier League", priorities["premier league"], true
	}
	// 6. La Liga
	if c == "ES" && (strings.Contains(n, "la liga") || strings.Contains(n, "primera")) {
		return "La Liga", priorities["la liga"], true
	}
	// 7. Serie A Italiana
	if c == "IT" && (strings.Contains(n, "serie a")) {
		return "Serie A Italiana", priorities["serie a italiana"], true
	}
	// 8. Bundesliga
	if c == "DE" && strings.Contains(n, "bundesliga") {
		return "Bundesliga", priorities["bundesliga"], true
	}
	// 9. Ligue 1
	if c == "FR" && strings.Contains(n, "ligue 1") {
		return "Ligue 1", priorities["ligue 1"], true
	}
	// 10. Champions League
	if strings.Contains(n, "champions league") {
		return "Champions League", priorities["champions league"], true
	}
	// 11. Europa League
	if strings.Contains(n, "europa league") {
		return "Europa League", priorities["europa league"], true
	}
	// 12. Copa do Mundo
	if strings.Contains(n, "copa do mundo") || strings.Contains(n, "world cup") {
		return "Copa do Mundo", priorities["copa do mundo"], true
	}

	return "", 99, false
}

var popularTeams = []string{
	// Europa
	"Real Madrid", "Barcelona", "Atletico Madrid", "Manchester City", "Man City",
	"Liverpool", "Arsenal", "Manchester United", "Man Utd", "Chelsea", "Tottenham",
	"Bayern", "Dortmund", "Bayer Leverkusen", "RB Leipzig", "Paris Saint-Germain", "PSG",
	"Juventus", "Milan", "Inter", "Napoli", "Roma", "Benfica", "Porto", "Sporting", "Ajax",

	// Brasil
	"Flamengo", "Palmeiras", "São Paulo", "Corinthians", "Grêmio", "Internacional",
	"Atlético Mineiro", "Atlético-MG", "Fluminense", "Botafogo", "Cruzeiro", "Vasco",
	"Santos", "Bahia", "Fortaleza", "Athletico",

	// Seleções (Copa 2022 + Principais)
	"Brasil", "Brazil", "Argentina", "França", "France", "Alemanha", "Germany",
	"Espanha", "Spain", "Inglaterra", "England", "Portugal", "Holanda", "Netherlands",
	"Bélgica", "Belgium", "Uruguai", "Uruguay", "Croácia", "Croatia", "Marrocos", "Morocco",
	"Japão", "Japan", "Senegal", "EUA", "USA", "México", "Mexico", "Polônia", "Poland",
	"Sérvia", "Serbia", "Suíça", "Switzerland", "Camarões", "Cameroon", "Gana", "Ghana",
	"Coreia do Sul", "South Korea", "Equador", "Ecuador", "Catar", "Qatar", "Tunísia", "Tunisia",
	"Canadá", "Canada", "Costa Rica", "Dinamarca", "Denmark", "Austrália", "Australia",
	"Gales", "Wales", "Irã", "Iran", "Arábia Saudita", "Saudi Arabia",
}

func isPopularTeam(teamName string) bool {
	teamName = strings.ToLower(teamName)
	for _, p := range popularTeams {
		if strings.Contains(teamName, strings.ToLower(p)) {
			return true
		}
	}
	return false
}

func isFriendly(compName string) bool {
	compName = strings.ToLower(compName)
	keywords := []string{"friendly", "amistoso", "club friendlies", "international friendlies"}
	for _, k := range keywords {
		if strings.Contains(compName, k) {
			return true
		}
	}
	return false
}

func isBrasil(m models.Match) bool {
	h := strings.ToLower(m.HomeTeam)
	a := strings.ToLower(m.AwayTeam)
	return h == "brasil" || h == "brazil" || a == "brasil" || a == "brazil"
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
		name, priority, ok := getStandardNameAndPriority(m.Competition, m.Country)

		if !ok {
			// Se não for uma das principais, verifica se é um amistoso de time conhecido
			if isFriendly(m.Competition) && (isPopularTeam(m.HomeTeam) || isPopularTeam(m.AwayTeam)) {
				name = "Amistosos"
				priority = priorities["amistosos"]
				ok = true
			}
		}

		if !ok {
			name = "Outros campeonatos"
			priority = 99
		}

		if _, exists := groups[name]; !ok || !exists {
			if _, exists := groups[name]; !exists {
				groups[name] = &CompetitionGroup{
					Name:     name,
					Priority: priority,
				}
				order = append(order, name)
			}
		}
		groups[name].Matches = append(groups[name].Matches, m)
	}

	out := make([]CompetitionGroup, 0, len(groups))
	for _, name := range order {
		g := groups[name]
		sort.SliceStable(g.Matches, func(i, j int) bool {
			// Prioridade especial para jogos do Brasil em Amistosos
			if name == "Amistosos" {
				iIsBrasil := isBrasil(g.Matches[i])
				jIsBrasil := isBrasil(g.Matches[j])
				if iIsBrasil && !jIsBrasil {
					return true
				}
				if !iIsBrasil && jIsBrasil {
					return false
				}
			}
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
