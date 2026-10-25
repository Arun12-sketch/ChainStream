export interface Chain {
  id: number;
  name: string;
  slug: string;
  network_type: string;
  rpc_url: string;
  ws_rpc_url?: string;
  confirmation_depth: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Block {
  chain_id: number;
  block_number: number;
  block_hash: string;
  parent_hash: string;
  timestamp: string;
  tx_count: number;
  gas_used: string;
  gas_limit: string;
  base_fee_per_gas: string;
  is_canonical: boolean;
  created_at: string;
}

export interface Transaction {
  chain_id: number;
  tx_hash: string;
  block_number: number;
  block_hash: string;
  tx_index: number;
  from_address: string;
  to_address?: string;
  value: string;
  gas_price: string;
  gas_used: string;
  status: number;
  input_data: string;
  is_canonical: boolean;
  created_at: string;
}

export interface EventLog {
  chain_id: number;
  log_index: number;
  tx_hash: string;
  block_number: number;
  block_hash: string;
  contract_address: string;
  event_name?: string;
  event_signature?: string;
  topic0?: string;
  topic1?: string;
  topic2?: string;
  topic3?: string;
  raw_data: string;
  decoded_params?: Record<string, any>;
  is_canonical: boolean;
  created_at: string;
}

export interface ChainStats {
  chain_id: number;
  name: string;
  total_blocks: number;
  total_transactions: number;
  total_events: number;
  latest_indexed_block: number;
  latest_block_hash: string;
  safe_confirmed_block: number;
  indexing_lag: number;
  reorg_count: number;
  rpc_status: string;
  events_per_sec: number;
}

export interface WorkerStatus {
  chain_id: number;
  chain_name: string;
  worker_id: string;
  fencing_token: number;
  current_block: number;
  last_checkpoint: number;
  throughput_bps: number;
  retry_count: number;
  heartbeat_at: string;
  lease_expires_at: string;
  is_healthy: boolean;
}

export interface ReorgRecord {
  id: number;
  chain_id: number;
  detected_at: string;
  from_block: number;
  to_block: number;
  orphaned_hash: string;
  canonical_hash: string;
  ancestor_block: number;
  ancestor_hash: string;
  affected_blocks_count: number;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  secret_key?: string;
  rate_limit_per_min: number;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    cursor?: string;
    has_more: boolean;
    total: number;
    limit: number;
  };
}
