-- ChainStream Database Schema Migration 001
-- Multi-chain blockchain indexing platform

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Chains Table
CREATE TABLE IF NOT EXISTS chains (
    id BIGINT PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    slug VARCHAR(32) NOT NULL UNIQUE,
    network_type VARCHAR(32) NOT NULL DEFAULT 'testnet',
    rpc_url TEXT NOT NULL,
    ws_rpc_url TEXT,
    confirmation_depth INT NOT NULL DEFAULT 12,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blocks Table
CREATE TABLE IF NOT EXISTS blocks (
    chain_id BIGINT NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
    block_number BIGINT NOT NULL,
    block_hash VARCHAR(66) NOT NULL,
    parent_hash VARCHAR(66) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    tx_count INT NOT NULL DEFAULT 0,
    gas_used NUMERIC(78, 0) DEFAULT 0,
    gas_limit NUMERIC(78, 0) DEFAULT 0,
    base_fee_per_gas NUMERIC(78, 0) DEFAULT 0,
    is_canonical BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (chain_id, block_number, block_hash)
);

CREATE INDEX IF NOT EXISTS idx_blocks_chain_number ON blocks(chain_id, block_number DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_chain_canonical ON blocks(chain_id, is_canonical, block_number DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blocks(chain_id, block_hash);
CREATE INDEX IF NOT EXISTS idx_blocks_parent_hash ON blocks(chain_id, parent_hash);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    chain_id BIGINT NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    block_hash VARCHAR(66) NOT NULL,
    tx_index INT NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42),
    value NUMERIC(78, 0) DEFAULT 0,
    gas_price NUMERIC(78, 0) DEFAULT 0,
    gas_used NUMERIC(78, 0) DEFAULT 0,
    status INT NOT NULL DEFAULT 1,
    input_data TEXT,
    is_canonical BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (chain_id, tx_hash, block_hash)
);

CREATE INDEX IF NOT EXISTS idx_tx_chain_hash ON transactions(chain_id, tx_hash);
CREATE INDEX IF NOT EXISTS idx_tx_chain_block ON transactions(chain_id, block_number, tx_index);
CREATE INDEX IF NOT EXISTS idx_tx_chain_from ON transactions(chain_id, from_address);
CREATE INDEX IF NOT EXISTS idx_tx_chain_to ON transactions(chain_id, to_address);
CREATE INDEX IF NOT EXISTS idx_tx_chain_canonical ON transactions(chain_id, is_canonical, block_number DESC);

-- Event Logs Table
CREATE TABLE IF NOT EXISTS event_logs (
    chain_id BIGINT NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
    log_index INT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    block_hash VARCHAR(66) NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    event_name VARCHAR(128),
    event_signature VARCHAR(66),
    topic0 VARCHAR(66),
    topic1 VARCHAR(66),
    topic2 VARCHAR(66),
    topic3 VARCHAR(66),
    raw_data TEXT,
    decoded_params JSONB,
    is_canonical BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (chain_id, block_hash, tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_logs_chain_contract ON event_logs(chain_id, contract_address);
CREATE INDEX IF NOT EXISTS idx_logs_chain_event_sig ON event_logs(chain_id, event_signature);
CREATE INDEX IF NOT EXISTS idx_logs_chain_event_name ON event_logs(chain_id, event_name);
CREATE INDEX IF NOT EXISTS idx_logs_chain_block_log ON event_logs(chain_id, block_number DESC, log_index);
CREATE INDEX IF NOT EXISTS idx_logs_chain_canonical ON event_logs(chain_id, is_canonical, block_number DESC);

-- Contract ABIs Table
CREATE TABLE IF NOT EXISTS contract_abis (
    id SERIAL PRIMARY KEY,
    chain_id BIGINT REFERENCES chains(id) ON DELETE CASCADE,
    contract_address VARCHAR(42),
    name VARCHAR(128) NOT NULL,
    abi_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abis_chain_contract ON contract_abis(chain_id, contract_address);

-- Indexer Checkpoints Table
CREATE TABLE IF NOT EXISTS indexer_checkpoints (
    chain_id BIGINT PRIMARY KEY REFERENCES chains(id) ON DELETE CASCADE,
    last_indexed_block BIGINT NOT NULL DEFAULT 0,
    last_indexed_hash VARCHAR(66) NOT NULL DEFAULT '',
    safe_confirmed_block BIGINT NOT NULL DEFAULT 0,
    fencing_token BIGINT NOT NULL DEFAULT 0,
    worker_id VARCHAR(128),
    lease_expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reorg History Table
CREATE TABLE IF NOT EXISTS reorg_history (
    id SERIAL PRIMARY KEY,
    chain_id BIGINT NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    from_block BIGINT NOT NULL,
    to_block BIGINT NOT NULL,
    orphaned_hash VARCHAR(66) NOT NULL,
    canonical_hash VARCHAR(66) NOT NULL,
    ancestor_block BIGINT NOT NULL,
    ancestor_hash VARCHAR(66) NOT NULL,
    affected_blocks_count INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_reorg_chain_time ON reorg_history(chain_id, detected_at DESC);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    rate_limit_per_min INT NOT NULL DEFAULT 120,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- Indexer Jobs Table
CREATE TABLE IF NOT EXISTS indexer_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id BIGINT NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
    job_type VARCHAR(32) NOT NULL,
    from_block BIGINT NOT NULL,
    to_block BIGINT NOT NULL,
    current_block BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_chain_status ON indexer_jobs(chain_id, status);

-- Worker Leases Table for Distributed Coordination & Fencing
CREATE TABLE IF NOT EXISTS worker_leases (
    chain_id BIGINT PRIMARY KEY REFERENCES chains(id) ON DELETE CASCADE,
    worker_id VARCHAR(128) NOT NULL,
    fencing_token BIGINT NOT NULL DEFAULT 1,
    lease_expires_at TIMESTAMPTZ NOT NULL,
    heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
