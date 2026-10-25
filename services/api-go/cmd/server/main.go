package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"chainstream/services/api-go/internal/config"
	"chainstream/services/api-go/internal/db"
	"chainstream/services/api-go/internal/docs"
	"chainstream/services/api-go/internal/handlers"
	"chainstream/services/api-go/internal/middleware"
	"chainstream/services/api-go/internal/websocket"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
)

func main() {
	// Initialize structured JSON logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	slog.Info("Starting ChainStream API Gateway & Query Service (Go)")

	cfg := config.Load()

	// Connect PostgreSQL
	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Warn("Database connection failed; running in degraded mock mode", "error", err)
	} else {
		slog.Info("Connected to PostgreSQL database pool")
	}

	// Connect Redis for WebSocket PubSub
	var redisCli *redis.Client
	opt, err := redis.ParseURL(cfg.RedisURL)
	if err == nil {
		redisCli = redis.NewClient(opt)
		slog.Info("Connected to Redis instance")
	} else {
		slog.Warn("Redis connection skipped", "error", err)
	}

	// Initialize WebSocket Hub
	hub := websocket.NewHub(redisCli)
	go hub.Run()

	// Rate limiter & Handlers
	rateLimiter := middleware.NewRateLimiter()
	h := handlers.New(database)

	r := chi.NewRouter()

	// Standard middleware
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)

	// CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-API-Key", "X-Request-ID"},
		ExposedHeaders:   []string{"Link", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// System & observability endpoints
	r.Get("/healthz", h.Healthz)
	r.Get("/readyz", h.Readyz)
	r.Handle("/metrics", promhttp.Handler())
	r.Get("/docs", docs.ServeSwaggerUI)
	r.Get("/api/openapi.json", docs.ServeOpenAPIJSON)

	// WebSocket endpoint
	r.Get("/api/v1/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket.ServeWs(hub, w, r)
	})

	// Authenticated API V1 Routes
	r.Route("/api/v1", func(r chi.Router) {
		if database != nil {
			r.Use(middleware.Auth(database, rateLimiter))
		}

		r.Get("/chains", h.GetChains)
		r.Get("/chains/{chainId}/stats", h.GetChainStats)
		r.Get("/chains/{chainId}/blocks", h.GetBlocks)
		r.Get("/chains/{chainId}/blocks/latest", h.GetLatestBlock)
		r.Get("/chains/{chainId}/blocks/{blockNumber}", h.GetBlockByNumber)
		r.Get("/chains/{chainId}/transactions", h.GetTransactions)
		r.Get("/chains/{chainId}/transactions/{txHash}", h.GetTransactionByHash)
		r.Get("/chains/{chainId}/events", h.GetEvents)

		r.Get("/workers", h.GetWorkers)
		r.Get("/infrastructure", h.GetInfrastructure)
		r.Get("/reorgs", h.GetReorgs)

		r.Get("/keys", h.GetApiKeys)
		r.Post("/keys", h.CreateApiKey)
		r.Delete("/keys/{id}", h.RevokeApiKey)
	})

	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Server runner
	go func() {
		slog.Info("ChainStream API Gateway listening", "port", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server listen error", "error", err)
		}
	}()

	// Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("Shutting down API server gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		slog.Error("Forced shutdown error", "error", err)
	}

	if database != nil {
		_ = database.Close()
	}
	if redisCli != nil {
		_ = redisCli.Close()
	}

	slog.Info("ChainStream API Gateway stopped cleanly.")
}
