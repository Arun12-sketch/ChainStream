package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"chainstream/services/api-go/internal/db"
	"chainstream/services/api-go/internal/models"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	db *db.DB
}

func New(database *db.DB) *Handler {
	return &Handler{db: database}
}

func (h *Handler) Healthz(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":  "healthy",
		"service": "api-go",
	})
}

func (h *Handler) Readyz(w http.ResponseWriter, r *http.Request) {
	if err := h.db.PingContext(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]interface{}{
			"status": "database unavailable",
			"error":  err.Error(),
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":  "ready",
		"service": "api-go",
	})
}

func (h *Handler) GetChains(w http.ResponseWriter, r *http.Request) {
	chains, err := h.db.GetChains(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch chains", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"data": chains})
}

func (h *Handler) GetChainStats(w http.ResponseWriter, r *http.Request) {
	chainID, err := strconv.ParseInt(chi.URLParam(r, "chainId"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid chainId", "")
		return
	}

	stats, err := h.db.GetChainStats(r.Context(), chainID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to calculate chain stats", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (h *Handler) GetBlocks(w http.ResponseWriter, r *http.Request) {
	chainID, err := strconv.ParseInt(chi.URLParam(r, "chainId"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid chainId", "")
		return
	}

	cursor := r.URL.Query().Get("cursor")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	canonicalOnly := r.URL.Query().Get("canonical") != "false"

	resp, err := h.db.GetBlocksPaginated(r.Context(), chainID, cursor, limit, canonicalOnly)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to query blocks", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) GetLatestBlock(w http.ResponseWriter, r *http.Request) {
	chainID, err := strconv.ParseInt(chi.URLParam(r, "chainId"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid chainId", "")
		return
	}

	block, err := h.db.GetLatestBlock(r.Context(), chainID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get latest block", err.Error())
		return
	}
	if block == nil {
		writeError(w, http.StatusNotFound, "No indexed blocks found for chain", "")
		return
	}
	writeJSON(w, http.StatusOK, block)
}

func (h *Handler) GetBlockByNumber(w http.ResponseWriter, r *http.Request) {
	chainID, err := strconv.ParseInt(chi.URLParam(r, "chainId"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid chainId", "")
		return
	}

	numParam := chi.URLParam(r, "blockNumber")
	var blockNum int64
	if strings.HasPrefix(numParam, "0x") {
		blockNum, err = strconv.ParseInt(strings.TrimPrefix(numParam, "0x"), 16, 64)
	} else {
		blockNum, err = strconv.ParseInt(numParam, 10, 64)
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid blockNumber", "")
		return
	}

	block, err := h.db.GetBlockByNumber(r.Context(), chainID, blockNum)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get block", err.Error())
		return
	}
	if block == nil {
		writeError(w, http.StatusNotFound, "Block not found", "")
		return
	}
	writeJSON(w, http.StatusOK, block)
}

func (h *Handler) GetTransactions(w http.ResponseWriter, r *http.Request) {
	chainID, err := strconv.ParseInt(chi.URLParam(r, "chainId"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid chainId", "")
		return
	}

	cursor := r.URL.Query().Get("cursor")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	resp, err := h.db.GetTransactionsPaginated(r.Context(), chainID, cursor, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to query transactions", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) GetTransactionByHash(w http.ResponseWriter, r *http.Request) {
	chainID, err := strconv.ParseInt(chi.URLParam(r, "chainId"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid chainId", "")
		return
	}

	txHash := chi.URLParam(r, "txHash")
	tx, err := h.db.GetTransactionByHash(r.Context(), chainID, txHash)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get transaction", err.Error())
		return
	}
	if tx == nil {
		writeError(w, http.StatusNotFound, "Transaction not found", "")
		return
	}
	writeJSON(w, http.StatusOK, tx)
}

func (h *Handler) GetEvents(w http.ResponseWriter, r *http.Request) {
	chainID, err := strconv.ParseInt(chi.URLParam(r, "chainId"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid chainId", "")
		return
	}

	contract := r.URL.Query().Get("contract")
	eventSig := r.URL.Query().Get("signature")
	fromBlock, _ := strconv.ParseInt(r.URL.Query().Get("fromBlock"), 10, 64)
	toBlock, _ := strconv.ParseInt(r.URL.Query().Get("toBlock"), 10, 64)
	cursor := r.URL.Query().Get("cursor")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	resp, err := h.db.GetEventsPaginated(r.Context(), chainID, contract, eventSig, fromBlock, toBlock, cursor, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to query events", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) GetWorkers(w http.ResponseWriter, r *http.Request) {
	statuses, err := h.db.GetWorkerStatuses(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to query workers", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"data": statuses})
}

func (h *Handler) GetInfrastructure(w http.ResponseWriter, r *http.Request) {
	chains, _ := h.db.GetChains(r.Context())
	workers, _ := h.db.GetWorkerStatuses(r.Context())

	infra := map[string]interface{}{
		"status": "healthy",
		"components": map[string]interface{}{
			"rust_indexer": map[string]interface{}{
				"status":        "healthy",
				"active_chains": len(chains),
				"metrics_port":  9090,
			},
			"kafka_cluster": map[string]interface{}{
				"status":       "healthy",
				"brokers":      "localhost:9092",
				"topics_count": 4,
			},
			"postgresql": map[string]interface{}{
				"status":     "healthy",
				"max_conns":  25,
				"idle_conns": 10,
			},
			"redis_cache": map[string]interface{}{
				"status": "healthy",
				"mode":   "pubsub & rate-limiting",
			},
			"api_gateway": map[string]interface{}{
				"status":  "healthy",
				"runtime": "go1.22",
			},
		},
		"workers": workers,
	}
	writeJSON(w, http.StatusOK, infra)
}

func (h *Handler) GetReorgs(w http.ResponseWriter, r *http.Request) {
	chainID, _ := strconv.ParseInt(r.URL.Query().Get("chainId"), 10, 64)
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	reorgs, err := h.db.GetReorgHistory(r.Context(), chainID, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to query reorg history", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"data": reorgs})
}

func (h *Handler) GetApiKeys(w http.ResponseWriter, r *http.Request) {
	keys, err := h.db.GetApiKeys(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to list API keys", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"data": keys})
}

func (h *Handler) CreateApiKey(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name            string `json:"name"`
		RateLimitPerMin int    `json:"rate_limit_per_min"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		writeError(w, http.StatusBadRequest, "Invalid request body; 'name' is required", "")
		return
	}

	if body.RateLimitPerMin <= 0 {
		body.RateLimitPerMin = 120
	}

	// Generate random 24-byte secret key
	randBytes := make([]byte, 24)
	_, _ = rand.Read(randBytes)
	secretKey := "cs_live_" + hex.EncodeToString(randBytes)
	prefix := secretKey[:12]

	hash := sha256.Sum256([]byte(secretKey))
	keyHash := hex.EncodeToString(hash[:])

	apiKey := &models.ApiKey{
		Name:            body.Name,
		KeyPrefix:       prefix,
		KeyHash:         keyHash,
		SecretKey:       secretKey,
		RateLimitPerMin: body.RateLimitPerMin,
		IsActive:        true,
	}

	if err := h.db.CreateApiKey(r.Context(), apiKey); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create API key", err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, apiKey)
}

func (h *Handler) RevokeApiKey(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.db.RevokeApiKey(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to revoke API key", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "API key revoked successfully"})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg, details string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(models.ErrorResponse{
		Error:   msg,
		Code:    status,
		Details: details,
	})
}
