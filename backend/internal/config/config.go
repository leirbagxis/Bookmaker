package config

import (
	"bufio"
	"log"
	"os"
	"strconv"
	"strings"
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
	loadDotEnv(".env")

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

// loadDotEnv lê um arquivo .env simples (linhas KEY=VALUE, comentários com #) e
// popula variáveis de ambiente que ainda não estejam definidas. Não exporta nada
// para o processo pai e não falha se o arquivo não existir.
func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		idx := strings.IndexByte(line, '=')
		if idx <= 0 {
			continue
		}
		key := strings.TrimSpace(line[:idx])
		val := strings.TrimSpace(line[idx+1:])
		val = strings.Trim(val, `"'`)
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, val)
		}
	}
	if err := scanner.Err(); err != nil {
		log.Printf("aviso: erro ao ler %s: %v", path, err)
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
