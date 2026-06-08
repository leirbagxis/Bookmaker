package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"superbet/backend/internal/cache"
	"superbet/backend/internal/config"
	"superbet/backend/internal/db"
	"superbet/backend/internal/httpclient"
	"superbet/backend/internal/models"
	"superbet/backend/internal/services"
	"superbet/backend/internal/static"
	"superbet/backend/internal/websocket"
)

func main() {
	cfg := config.Load()

	httpc := httpclient.New(10 * time.Second)

	database, err := db.NewPostgresWrapper(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("erro ao inicializar PostgreSQL: %v", err)
	}
	defer database.Close()

	redisClient, err := cache.NewRedis(cfg.RedisURL)
	if err != nil {
		log.Fatalf("erro ao inicializar Redis: %v", err)
	}
	defer redisClient.Close()

	oddsCache := cache.NewOddsRedis(redisClient, cfg.CacheTTL)

	oddsInMemory := cache.New[int64, []models.OddsMarket](cfg.CacheTTL)

	hub := websocket.NewHub()

	matchSvc := services.NewMatchService(cfg, httpc, database, hub, oddsCache)
	oddsSvc := services.NewOddsService(cfg, httpc, oddsInMemory, hub, oddsCache)
	userSvc := services.NewUserService(database)
	bettingSvc := services.NewBettingService(database, oddsSvc)
	settlementSvc := services.NewSettlementService(cfg, httpc, database)

	ctxPolling, cancelPolling := context.WithCancel(context.Background())
	defer cancelPolling()
	matchSvc.StartPolling(ctxPolling)
	oddsSvc.StartEventPolling(ctxPolling)
	settlementSvc.StartPolling(ctxPolling)

	server := &websocket.Server{
		Hub:     hub,
		Matches: matchSvc,
		Odds:    oddsSvc,
		Users:   userSvc,
		Betting: bettingSvc,
	}
	wsHandler := websocket.NewHandler(hub, server)

	apiHandler := static.NewAPIHandler(userSvc, bettingSvc, hub)

	mux := http.NewServeMux()
	apiHandler.RegisterRoutes(mux)
	mux.Handle("/ws", wsHandler)

	staticDir := cfg.StaticDir
	if env := os.Getenv("STATIC_DIR"); env != "" {
		staticDir = env
	}
	if abs, err := filepath.Abs(staticDir); err == nil {
		staticDir = abs
	}
	mux.Handle("/", static.New(staticDir))

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("SuperBet escutando em :%s (static=%s, cacheTTL=%s)", cfg.Port, staticDir, cfg.CacheTTL)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("erro no servidor: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	log.Println("encerrando servidor...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
