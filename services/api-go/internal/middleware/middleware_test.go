package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequestIDMiddleware(t *testing.T) {
	handler := RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := r.Header.Get("X-Request-ID")
		if reqID == "" {
			t.Errorf("expected X-Request-ID header to be set")
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/healthz", nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
	}

	resHeader := rr.Header().Get("X-Request-ID")
	if resHeader == "" {
		t.Errorf("expected X-Request-ID response header")
	}
}

func TestRateLimiter(t *testing.T) {
	limiter := NewRateLimiter()

	// Rate limit: 2 requests per minute
	allowed1, rem1 := limiter.Allow("test_key", 2)
	if !allowed1 || rem1 != 1 {
		t.Errorf("first request should be allowed, remaining should be 1, got allowed=%v rem=%d", allowed1, rem1)
	}

	allowed2, rem2 := limiter.Allow("test_key", 2)
	if !allowed2 || rem2 != 0 {
		t.Errorf("second request should be allowed, remaining should be 0, got allowed=%v rem=%d", allowed2, rem2)
	}

	allowed3, _ := limiter.Allow("test_key", 2)
	if allowed3 {
		t.Errorf("third request should be rejected by rate limiter")
	}
}
