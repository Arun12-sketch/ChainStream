package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"chainstream/services/api-go/internal/db"
	"chainstream/services/api-go/internal/models"
	"github.com/google/uuid"
)

type contextKey string

const (
	RequestIDKey contextKey = "request_id"
	APIKeyData   contextKey = "api_key_data"
)

func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			reqID = uuid.New().String()
			r.Header.Set("X-Request-ID", reqID)
		}
		w.Header().Set("X-Request-ID", reqID)
		ctx := context.WithValue(r.Context(), RequestIDKey, reqID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(rec, r)

		reqID, _ := r.Context().Value(RequestIDKey).(string)
		slog.Info("HTTP request processed",
			"request_id", reqID,
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(start).Milliseconds(),
			"remote_ip", r.RemoteAddr,
		)
	})
}

// Memory rate limiter bucket
type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
}

type bucket struct {
	tokens     float64
	lastUpdate time.Time
	limit      float64
	rate       float64
}

func NewRateLimiter() *RateLimiter {
	rl := &RateLimiter{buckets: make(map[string]*bucket)}
	go func() {
		for range time.Tick(10 * time.Minute) {
			rl.mu.Lock()
			now := time.Now()
			for k, b := range rl.buckets {
				if now.Sub(b.lastUpdate) > 10*time.Minute {
					delete(rl.buckets, k)
				}
			}
			rl.mu.Unlock()
		}
	}()
	return rl
}

func (rl *RateLimiter) Allow(key string, limitPerMin int) (bool, int) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, exists := rl.buckets[key]
	if !exists {
		limit := float64(limitPerMin)
		rate := limit / 60.0
		b = &bucket{tokens: limit - 1, lastUpdate: now, limit: limit, rate: rate}
		rl.buckets[key] = b
		return true, int(b.tokens)
	}

	elapsed := now.Sub(b.lastUpdate).Seconds()
	b.lastUpdate = now
	b.tokens = b.tokens + elapsed*b.rate
	if b.tokens > b.limit {
		b.tokens = b.limit
	}

	if b.tokens >= 1.0 {
		b.tokens -= 1.0
		return true, int(b.tokens)
	}

	return false, 0
}

func Auth(database *db.DB, limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			apiKeyHeader := r.Header.Get("X-API-Key")
			if apiKeyHeader == "" {
				apiKeyHeader = r.URL.Query().Get("api_key")
			}

			// Public endpoints don't strictly require API key
			isPublic := r.URL.Path == "/healthz" || r.URL.Path == "/readyz" || r.URL.Path == "/metrics" ||
				r.URL.Path == "/docs" || r.URL.Path == "/api/openapi.json"

			if apiKeyHeader == "" {
				if isPublic {
					next.ServeHTTP(w, r)
					return
				}
				// Default rate limiting by IP for public reads
				ip := r.RemoteAddr
				allowed, remaining := limiter.Allow(ip, 60)
				w.Header().Set("X-RateLimit-Limit", "60")
				w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
				if !allowed {
					writeJSONError(w, http.StatusTooManyRequests, "Rate limit exceeded. Provide an X-API-Key for higher limits.")
					return
				}
				next.ServeHTTP(w, r)
				return
			}

			// Validate provided API key
			hash := sha256.Sum256([]byte(apiKeyHeader))
			keyHash := hex.EncodeToString(hash[:])

			isActive, limit, err := database.ValidateApiKey(r.Context(), keyHash)
			if err != nil || !isActive {
				writeJSONError(w, http.StatusUnauthorized, "Invalid or revoked API key")
				return
			}

			allowed, remaining := limiter.Allow(keyHash, limit)
			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
			w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
			if !allowed {
				writeJSONError(w, http.StatusTooManyRequests, "Per-key rate limit exceeded")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func writeJSONError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(models.ErrorResponse{
		Error: http.StatusText(code),
		Code:  code,
		Details: msg,
	})
}
