package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port           string
	CacheTTL       time.Duration
	TimezoneOffset int
	SuperScoreBase string
	SuperbetBase   string
	BookmakerID    string
	SportID        string
	Language       string
	StaticDir      string
}

func Load() *Config {
	port := getenv("PORT", "8080")

	ttl := parseInt(getenv("CACHE_TTL_SECONDS", "60"), 60)
	if ttl < 5 {
		ttl = 5
	}
	if ttl > 600 {
		ttl = 600
	}

	offset := parseInt(getenv("TIMEZONE_OFFSET", "-3"), -3)

	return &Config{
		Port:           port,
		CacheTTL:       time.Duration(ttl) * time.Second,
		TimezoneOffset: offset,
		SuperScoreBase: getenv("SUPER_SCORE_BASE_URL", "https://api.content-prod.superscore.live"),
		SuperbetBase:   getenv("SUPERBET_BASE_URL", "https://production-superbet-offer-br.freetls.fastly.net"),
		BookmakerID:    getenv("SUPER_SCORE_BOOKMAKER_ID", "76"),
		SportID:        getenv("SUPER_SCORE_SPORT_ID", "1"),
		Language:       getenv("SUPER_SCORE_LANGUAGE", "pt-BR"),
		StaticDir:      getenv("STATIC_DIR", "../frontend/dist"),
	}
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func parseInt(s string, def int) int {
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return n
}
