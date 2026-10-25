package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"chainstream/services/api-go/internal/models"
	_ "github.com/lib/pq"
)

type DB struct {
	*sql.DB
}

func Connect(connStr string) (*DB, error) {
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &DB{db}, nil
}

func (db *DB) GetChains(ctx context.Context) ([]models.Chain, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, name, slug, network_type, rpc_url, ws_rpc_url, confirmation_depth, is_active, created_at, updated_at
		FROM chains ORDER BY id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chains []models.Chain
	for rows.Next() {
		var c models.Chain
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.NetworkType, &c.RpcUrl, &c.WsRpcUrl, &c.ConfirmationDepth, &c.IsActive, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		chains = append(chains, c)
	}
	return chains, nil
}

func (db *DB) GetChainByID(ctx context.Context, id int64) (*models.Chain, error) {
	var c models.Chain
	err := db.QueryRowContext(ctx, `
		SELECT id, name, slug, network_type, rpc_url, ws_rpc_url, confirmation_depth, is_active, created_at, updated_at
		FROM chains WHERE id = $1
	`, id).Scan(&c.ID, &c.Name, &c.Slug, &c.NetworkType, &c.RpcUrl, &c.WsRpcUrl, &c.ConfirmationDepth, &c.IsActive, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (db *DB) GetLatestBlock(ctx context.Context, chainID int64) (*models.Block, error) {
	var b models.Block
	err := db.QueryRowContext(ctx, `
		SELECT chain_id, block_number, block_hash, parent_hash, timestamp, tx_count, gas_used, gas_limit, base_fee_per_gas, is_canonical, created_at
		FROM blocks
		WHERE chain_id = $1 AND is_canonical = true
		ORDER BY block_number DESC
		LIMIT 1
	`, chainID).Scan(&b.ChainID, &b.BlockNumber, &b.BlockHash, &b.ParentHash, &b.Timestamp, &b.TxCount, &b.GasUsed, &b.GasLimit, &b.BaseFeePerGas, &b.IsCanonical, &b.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (db *DB) GetBlockByNumber(ctx context.Context, chainID int64, blockNumber int64) (*models.Block, error) {
	var b models.Block
	err := db.QueryRowContext(ctx, `
		SELECT chain_id, block_number, block_hash, parent_hash, timestamp, tx_count, gas_used, gas_limit, base_fee_per_gas, is_canonical, created_at
		FROM blocks
		WHERE chain_id = $1 AND block_number = $2
		ORDER BY is_canonical DESC
		LIMIT 1
	`, chainID, blockNumber).Scan(&b.ChainID, &b.BlockNumber, &b.BlockHash, &b.ParentHash, &b.Timestamp, &b.TxCount, &b.GasUsed, &b.GasLimit, &b.BaseFeePerGas, &b.IsCanonical, &b.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (db *DB) GetBlocksPaginated(ctx context.Context, chainID int64, cursor string, limit int, canonicalOnly bool) (*models.PaginatedResponse[models.Block], error) {
	if limit <= 0 || limit > 100 {
		limit = 25
	}

	query := `
		SELECT chain_id, block_number, block_hash, parent_hash, timestamp, tx_count, gas_used, gas_limit, base_fee_per_gas, is_canonical, created_at
		FROM blocks
		WHERE chain_id = $1
	`
	args := []interface{}{chainID}
	argIdx := 2

	if canonicalOnly {
		query += fmt.Sprintf(" AND is_canonical = true")
	}

	if cursor != "" {
		if cursorNum, err := strconv.ParseInt(cursor, 10, 64); err == nil {
			query += fmt.Sprintf(" AND block_number < $%d", argIdx)
			args = append(args, cursorNum)
			argIdx++
		}
	}

	query += fmt.Sprintf(" ORDER BY block_number DESC LIMIT $%d", argIdx)
	args = append(args, limit+1)

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var blocks []models.Block
	for rows.Next() {
		var b models.Block
		if err := rows.Scan(&b.ChainID, &b.BlockNumber, &b.BlockHash, &b.ParentHash, &b.Timestamp, &b.TxCount, &b.GasUsed, &b.GasLimit, &b.BaseFeePerGas, &b.IsCanonical, &b.CreatedAt); err != nil {
			return nil, err
		}
		blocks = append(blocks, b)
	}

	hasMore := false
	var nextCursor string
	if len(blocks) > limit {
		hasMore = true
		blocks = blocks[:limit]
		nextCursor = strconv.FormatInt(blocks[len(blocks)-1].BlockNumber, 10)
	}

	var total int64
	_ = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM blocks WHERE chain_id = $1", chainID).Scan(&total)

	return &models.PaginatedResponse[models.Block]{
		Data: blocks,
		Pagination: models.Pagination{
			Cursor:  nextCursor,
			HasMore: hasMore,
			Total:   total,
			Limit:   limit,
		},
	}, nil
}

func (db *DB) GetTransactionByHash(ctx context.Context, chainID int64, txHash string) (*models.Transaction, error) {
	var tx models.Transaction
	err := db.QueryRowContext(ctx, `
		SELECT chain_id, tx_hash, block_number, block_hash, tx_index, from_address, to_address, value, gas_price, gas_used, status, input_data, is_canonical, created_at
		FROM transactions
		WHERE chain_id = $1 AND tx_hash = $2
		ORDER BY is_canonical DESC
		LIMIT 1
	`, chainID, txHash).Scan(&tx.ChainID, &tx.TxHash, &tx.BlockNumber, &tx.BlockHash, &tx.TxIndex, &tx.FromAddress, &tx.ToAddress, &tx.Value, &tx.GasPrice, &tx.GasUsed, &tx.Status, &tx.InputData, &tx.IsCanonical, &tx.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &tx, nil
}

func (db *DB) GetTransactionsPaginated(ctx context.Context, chainID int64, cursor string, limit int) (*models.PaginatedResponse[models.Transaction], error) {
	if limit <= 0 || limit > 100 {
		limit = 25
	}

	query := `
		SELECT chain_id, tx_hash, block_number, block_hash, tx_index, from_address, to_address, value, gas_price, gas_used, status, input_data, is_canonical, created_at
		FROM transactions
		WHERE chain_id = $1
	`
	args := []interface{}{chainID}
	argIdx := 2

	if cursor != "" {
		if cursorNum, err := strconv.ParseInt(cursor, 10, 64); err == nil {
			query += fmt.Sprintf(" AND block_number < $%d", argIdx)
			args = append(args, cursorNum)
			argIdx++
		}
	}

	query += fmt.Sprintf(" ORDER BY block_number DESC, tx_index ASC LIMIT $%d", argIdx)
	args = append(args, limit+1)

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var txs []models.Transaction
	for rows.Next() {
		var tx models.Transaction
		if err := rows.Scan(&tx.ChainID, &tx.TxHash, &tx.BlockNumber, &tx.BlockHash, &tx.TxIndex, &tx.FromAddress, &tx.ToAddress, &tx.Value, &tx.GasPrice, &tx.GasUsed, &tx.Status, &tx.InputData, &tx.IsCanonical, &tx.CreatedAt); err != nil {
			return nil, err
		}
		txs = append(txs, tx)
	}

	hasMore := false
	var nextCursor string
	if len(txs) > limit {
		hasMore = true
		txs = txs[:limit]
		nextCursor = strconv.FormatInt(txs[len(txs)-1].BlockNumber, 10)
	}

	var total int64
	_ = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM transactions WHERE chain_id = $1", chainID).Scan(&total)

	return &models.PaginatedResponse[models.Transaction]{
		Data: txs,
		Pagination: models.Pagination{
			Cursor:  nextCursor,
			HasMore: hasMore,
			Total:   total,
			Limit:   limit,
		},
	}, nil
}

func (db *DB) GetEventsPaginated(ctx context.Context, chainID int64, contract, eventSig string, fromBlock, toBlock int64, cursor string, limit int) (*models.PaginatedResponse[models.EventLog], error) {
	if limit <= 0 || limit > 100 {
		limit = 25
	}

	query := `
		SELECT chain_id, log_index, tx_hash, block_number, block_hash, contract_address, event_name, event_signature, topic0, topic1, topic2, topic3, raw_data, decoded_params, is_canonical, created_at
		FROM event_logs
		WHERE chain_id = $1
	`
	args := []interface{}{chainID}
	argIdx := 2

	if contract != "" {
		query += fmt.Sprintf(" AND contract_address = $%d", argIdx)
		args = append(args, contract)
		argIdx++
	}
	if eventSig != "" {
		query += fmt.Sprintf(" AND event_signature = $%d", argIdx)
		args = append(args, eventSig)
		argIdx++
	}
	if fromBlock > 0 {
		query += fmt.Sprintf(" AND block_number >= $%d", argIdx)
		args = append(args, fromBlock)
		argIdx++
	}
	if toBlock > 0 {
		query += fmt.Sprintf(" AND block_number <= $%d", argIdx)
		args = append(args, toBlock)
		argIdx++
	}

	if cursor != "" {
		if cursorNum, err := strconv.ParseInt(cursor, 10, 64); err == nil {
			query += fmt.Sprintf(" AND block_number < $%d", argIdx)
			args = append(args, cursorNum)
			argIdx++
		}
	}

	query += fmt.Sprintf(" ORDER BY block_number DESC, log_index ASC LIMIT $%d", argIdx)
	args = append(args, limit+1)

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.EventLog
	for rows.Next() {
		var l models.EventLog
		var decodedRaw []byte
		if err := rows.Scan(&l.ChainID, &l.LogIndex, &l.TxHash, &l.BlockNumber, &l.BlockHash, &l.ContractAddress, &l.EventName, &l.EventSignature, &l.Topic0, &l.Topic1, &l.Topic2, &l.Topic3, &l.RawData, &decodedRaw, &l.IsCanonical, &l.CreatedAt); err != nil {
			return nil, err
		}
		if len(decodedRaw) > 0 {
			raw := json.RawMessage(decodedRaw)
			l.DecodedParams = &raw
		}
		logs = append(logs, l)
	}

	hasMore := false
	var nextCursor string
	if len(logs) > limit {
		hasMore = true
		logs = logs[:limit]
		nextCursor = strconv.FormatInt(logs[len(logs)-1].BlockNumber, 10)
	}

	var total int64
	_ = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM event_logs WHERE chain_id = $1", chainID).Scan(&total)

	return &models.PaginatedResponse[models.EventLog]{
		Data: logs,
		Pagination: models.Pagination{
			Cursor:  nextCursor,
			HasMore: hasMore,
			Total:   total,
			Limit:   limit,
		},
	}, nil
}

func (db *DB) GetChainStats(ctx context.Context, chainID int64) (*models.ChainStats, error) {
	stats := &models.ChainStats{ChainID: chainID}

	_ = db.QueryRowContext(ctx, "SELECT name FROM chains WHERE id = $1", chainID).Scan(&stats.Name)
	_ = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM blocks WHERE chain_id = $1", chainID).Scan(&stats.TotalBlocks)
	_ = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM transactions WHERE chain_id = $1", chainID).Scan(&stats.TotalTransactions)
	_ = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM event_logs WHERE chain_id = $1", chainID).Scan(&stats.TotalEvents)
	_ = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM reorg_history WHERE chain_id = $1", chainID).Scan(&stats.ReorgCount)

	_ = db.QueryRowContext(ctx, `
		SELECT last_indexed_block, last_indexed_hash, safe_confirmed_block
		FROM indexer_checkpoints WHERE chain_id = $1
	`, chainID).Scan(&stats.LatestIndexedBlock, &stats.LatestBlockHash, &stats.SafeConfirmedBlock)

	stats.RPCStatus = "healthy"
	stats.EventsPerSec = 14.5
	stats.IndexingLag = 0

	return stats, nil
}

func (db *DB) GetWorkerStatuses(ctx context.Context) ([]models.WorkerStatus, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT c.id, c.name, COALESCE(w.worker_id, 'unassigned'), COALESCE(w.fencing_token, 0),
		       COALESCE(cp.last_indexed_block, 0), COALESCE(w.heartbeat_at, NOW()), COALESCE(w.lease_expires_at, NOW())
		FROM chains c
		LEFT JOIN worker_leases w ON c.id = w.chain_id
		LEFT JOIN indexer_checkpoints cp ON c.id = cp.chain_id
		ORDER BY c.id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var statuses []models.WorkerStatus
	for rows.Next() {
		var s models.WorkerStatus
		if err := rows.Scan(&s.ChainID, &s.ChainName, &s.WorkerID, &s.FencingToken, &s.CurrentBlock, &s.HeartbeatAt, &s.LeaseExpiresAt); err != nil {
			return nil, err
		}
		s.LastCheckpoint = s.CurrentBlock
		s.ThroughputBps = 2.4
		s.IsHealthy = time.Now().Before(s.LeaseExpiresAt)
		statuses = append(statuses, s)
	}
	return statuses, nil
}

func (db *DB) GetReorgHistory(ctx context.Context, chainID int64, limit int) ([]models.ReorgRecord, error) {
	if limit <= 0 {
		limit = 20
	}
	query := `
		SELECT id, chain_id, detected_at, from_block, to_block, orphaned_hash, canonical_hash, ancestor_block, ancestor_hash, affected_blocks_count
		FROM reorg_history
	`
	var args []interface{}
	if chainID > 0 {
		query += " WHERE chain_id = $1"
		args = append(args, chainID)
		query += fmt.Sprintf(" ORDER BY detected_at DESC LIMIT $%d", len(args)+1)
		args = append(args, limit)
	} else {
		query += fmt.Sprintf(" ORDER BY detected_at DESC LIMIT $%d", len(args)+1)
		args = append(args, limit)
	}

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []models.ReorgRecord
	for rows.Next() {
		var r models.ReorgRecord
		if err := rows.Scan(&r.ID, &r.ChainID, &r.DetectedAt, &r.FromBlock, &r.ToBlock, &r.OrphanedHash, &r.CanonicalHash, &r.AncestorBlock, &r.AncestorHash, &r.AffectedBlocksCount); err != nil {
			return nil, err
		}
		records = append(records, r)
	}
	return records, nil
}

func (db *DB) GetApiKeys(ctx context.Context) ([]models.ApiKey, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, name, key_prefix, rate_limit_per_min, is_active, last_used_at, created_at
		FROM api_keys ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []models.ApiKey
	for rows.Next() {
		var k models.ApiKey
		if err := rows.Scan(&k.ID, &k.Name, &k.KeyPrefix, &k.RateLimitPerMin, &k.IsActive, &k.LastUsedAt, &k.CreatedAt); err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, nil
}

func (db *DB) CreateApiKey(ctx context.Context, key *models.ApiKey) error {
	return db.QueryRowContext(ctx, `
		INSERT INTO api_keys (name, key_prefix, key_hash, rate_limit_per_min, is_active, created_at)
		VALUES ($1, $2, $3, $4, true, NOW())
		RETURNING id, created_at
	`, key.Name, key.KeyPrefix, key.KeyHash, key.RateLimitPerMin).Scan(&key.ID, &key.CreatedAt)
}

func (db *DB) RevokeApiKey(ctx context.Context, id string) error {
	_, err := db.ExecContext(ctx, "UPDATE api_keys SET is_active = false WHERE id = $1", id)
	return err
}

func (db *DB) ValidateApiKey(ctx context.Context, keyHash string) (bool, int, error) {
	var isActive bool
	var rateLimit int
	err := db.QueryRowContext(ctx, `
		UPDATE api_keys 
		SET last_used_at = NOW() 
		WHERE key_hash = $1 
		RETURNING is_active, rate_limit_per_min
	`, keyHash).Scan(&isActive, &rateLimit)
	if err == sql.ErrNoRows {
		return false, 0, nil
	}
	if err != nil {
		return false, 0, err
	}
	return isActive, rateLimit, nil
}
