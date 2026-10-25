package models

import (
	"encoding/json"
	"time"
)

type Chain struct {
	ID                int64     `json:"id"`
	Name              string    `json:"name"`
	Slug              string    `json:"slug"`
	NetworkType       string    `json:"network_type"`
	RpcUrl            string    `json:"rpc_url"`
	WsRpcUrl          *string   `json:"ws_rpc_url,omitempty"`
	ConfirmationDepth int       `json:"confirmation_depth"`
	IsActive          bool      `json:"is_active"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type Block struct {
	ChainID        int64     `json:"chain_id"`
	BlockNumber    int64     `json:"block_number"`
	BlockHash      string    `json:"block_hash"`
	ParentHash     string    `json:"parent_hash"`
	Timestamp      time.Time `json:"timestamp"`
	TxCount        int       `json:"tx_count"`
	GasUsed        string    `json:"gas_used"`
	GasLimit       string    `json:"gas_limit"`
	BaseFeePerGas  string    `json:"base_fee_per_gas"`
	IsCanonical    bool      `json:"is_canonical"`
	CreatedAt      time.Time `json:"created_at"`
}

type Transaction struct {
	ChainID     int64     `json:"chain_id"`
	TxHash      string    `json:"tx_hash"`
	BlockNumber int64     `json:"block_number"`
	BlockHash   string    `json:"block_hash"`
	TxIndex     int       `json:"tx_index"`
	FromAddress string    `json:"from_address"`
	ToAddress   *string   `json:"to_address,omitempty"`
	Value       string    `json:"value"`
	GasPrice    string    `json:"gas_price"`
	GasUsed     string    `json:"gas_used"`
	Status      int       `json:"status"`
	InputData   string    `json:"input_data"`
	IsCanonical bool      `json:"is_canonical"`
	CreatedAt   time.Time `json:"created_at"`
}

type EventLog struct {
	ChainID         int64            `json:"chain_id"`
	LogIndex        int              `json:"log_index"`
	TxHash          string           `json:"tx_hash"`
	BlockNumber     int64            `json:"block_number"`
	BlockHash       string           `json:"block_hash"`
	ContractAddress string           `json:"contract_address"`
	EventName       *string          `json:"event_name,omitempty"`
	EventSignature  *string          `json:"event_signature,omitempty"`
	Topic0          *string          `json:"topic0,omitempty"`
	Topic1          *string          `json:"topic1,omitempty"`
	Topic2          *string          `json:"topic2,omitempty"`
	Topic3          *string          `json:"topic3,omitempty"`
	RawData         string           `json:"raw_data"`
	DecodedParams   *json.RawMessage `json:"decoded_params,omitempty"`
	IsCanonical     bool             `json:"is_canonical"`
	CreatedAt       time.Time        `json:"created_at"`
}

type ChainStats struct {
	ChainID            int64  `json:"chain_id"`
	Name               string `json:"name"`
	TotalBlocks        int64  `json:"total_blocks"`
	TotalTransactions  int64  `json:"total_transactions"`
	TotalEvents        int64  `json:"total_events"`
	LatestIndexedBlock int64  `json:"latest_indexed_block"`
	LatestBlockHash    string `json:"latest_block_hash"`
	SafeConfirmedBlock int64  `json:"safe_confirmed_block"`
	IndexingLag        int64  `json:"indexing_lag"`
	ReorgCount         int64  `json:"reorg_count"`
	RPCStatus          string `json:"rpc_status"`
	EventsPerSec       float64`json:"events_per_sec"`
}

type ApiKey struct {
	ID              string     `json:"id"`
	Name            string     `json:"name"`
	KeyPrefix       string     `json:"key_prefix"`
	KeyHash         string     `json:"-"`
	SecretKey       string     `json:"secret_key,omitempty"` // only returned on creation
	RateLimitPerMin int        `json:"rate_limit_per_min"`
	IsActive        bool       `json:"is_active"`
	LastUsedAt      *time.Time `json:"last_used_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

type WorkerStatus struct {
	ChainID        int64     `json:"chain_id"`
	ChainName      string    `json:"chain_name"`
	WorkerID       string    `json:"worker_id"`
	FencingToken   int64     `json:"fencing_token"`
	CurrentBlock   int64     `json:"current_block"`
	LastCheckpoint int64     `json:"last_checkpoint"`
	ThroughputBps  float64   `json:"throughput_bps"`
	RetryCount     int       `json:"retry_count"`
	HeartbeatAt    time.Time `json:"heartbeat_at"`
	LeaseExpiresAt time.Time `json:"lease_expires_at"`
	IsHealthy      bool      `json:"is_healthy"`
}

type ReorgRecord struct {
	ID                  int64     `json:"id"`
	ChainID             int64     `json:"chain_id"`
	DetectedAt          time.Time `json:"detected_at"`
	FromBlock           int64     `json:"from_block"`
	ToBlock             int64     `json:"to_block"`
	OrphanedHash        string    `json:"orphaned_hash"`
	CanonicalHash       string    `json:"canonical_hash"`
	AncestorBlock       int64     `json:"ancestor_block"`
	AncestorHash        string    `json:"ancestor_hash"`
	AffectedBlocksCount int       `json:"affected_blocks_count"`
}

type Pagination struct {
	Cursor  string `json:"cursor,omitempty"`
	HasMore bool   `json:"has_more"`
	Total   int64  `json:"total"`
	Limit   int    `json:"limit"`
}

type PaginatedResponse[T any] struct {
	Data       []T        `json:"data"`
	Pagination Pagination `json:"pagination"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Code    int    `json:"code"`
	Details string `json:"details,omitempty"`
}
