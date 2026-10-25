package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthz(t *testing.T) {
	h := New(nil)
	req := httptest.NewRequest("GET", "/healthz", nil)
	rr := httptest.NewRecorder()

	h.Healthz(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", rr.Code)
	}

	var res map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if res["status"] != "healthy" {
		t.Errorf("expected status 'healthy', got '%v'", res["status"])
	}
}
