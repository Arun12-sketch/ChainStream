use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainConfig {
    pub chain_id: u64,
    pub name: String,
    pub slug: String,
    pub network_type: String,
    pub rpc_url: String,
    pub fallback_rpc_urls: Vec<String>,
    pub ws_rpc_url: Option<String>,
    pub confirmation_depth: u64,
    pub poll_interval_ms: u64,
    pub max_batch_size: u64,
    pub start_block: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcBlock {
    pub number: Option<String>,
    pub hash: Option<String>,
    #[serde(rename = "parentHash")]
    pub parent_hash: Option<String>,
    pub timestamp: Option<String>,
    pub transactions: Vec<RpcTransaction>,
    #[serde(rename = "gasUsed")]
    pub gas_used: Option<String>,
    #[serde(rename = "gasLimit")]
    pub gas_limit: Option<String>,
    #[serde(rename = "baseFeePerGas")]
    pub base_fee_per_gas: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcTransaction {
    pub hash: String,
    #[serde(rename = "blockNumber")]
    pub block_number: Option<String>,
    #[serde(rename = "blockHash")]
    pub block_hash: Option<String>,
    #[serde(rename = "transactionIndex")]
    pub transaction_index: Option<String>,
    pub from: String,
    pub to: Option<String>,
    pub value: Option<String>,
    #[serde(rename = "gasPrice")]
    pub gas_price: Option<String>,
    pub gas: Option<String>,
    pub input: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcReceipt {
    #[serde(rename = "transactionHash")]
    pub transaction_hash: String,
    #[serde(rename = "transactionIndex")]
    pub transaction_index: Option<String>,
    #[serde(rename = "blockNumber")]
    pub block_number: Option<String>,
    #[serde(rename = "blockHash")]
    pub block_hash: Option<String>,
    #[serde(rename = "gasUsed")]
    pub gas_used: Option<String>,
    pub status: Option<String>,
    pub logs: Vec<RpcLog>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcLog {
    pub address: String,
    pub topics: Vec<String>,
    pub data: String,
    #[serde(rename = "blockNumber")]
    pub block_number: Option<String>,
    #[serde(rename = "transactionHash")]
    pub transaction_hash: Option<String>,
    #[serde(rename = "transactionIndex")]
    pub transaction_index: Option<String>,
    #[serde(rename = "blockHash")]
    pub block_hash: Option<String>,
    #[serde(rename = "logIndex")]
    pub log_index: Option<String>,
}

// Normalized Messages matching JSON Schema & Kafka Topics

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockMessage {
    pub version: String,
    pub chain_id: u64,
    pub block_number: u64,
    pub block_hash: String,
    pub parent_hash: String,
    pub timestamp: i64,
    pub tx_count: u32,
    pub gas_used: String,
    pub gas_limit: String,
    pub base_fee_per_gas: String,
    pub is_canonical: bool,
    pub confirmation_depth: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionMessage {
    pub version: String,
    pub chain_id: u64,
    pub tx_hash: String,
    pub block_number: u64,
    pub block_hash: String,
    pub tx_index: u32,
    pub from_address: String,
    pub to_address: Option<String>,
    pub value: String,
    pub gas_price: String,
    pub gas_used: String,
    pub status: u32,
    pub input_data: String,
    pub is_canonical: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventLogMessage {
    pub version: String,
    pub chain_id: u64,
    pub log_index: u32,
    pub tx_hash: String,
    pub block_number: u64,
    pub block_hash: String,
    pub contract_address: String,
    pub event_name: Option<String>,
    pub event_signature: Option<String>,
    pub topic0: Option<String>,
    pub topic1: Option<String>,
    pub topic2: Option<String>,
    pub topic3: Option<String>,
    pub raw_data: String,
    pub decoded_params: Option<serde_json::Value>,
    pub is_canonical: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReorgMessage {
    pub version: String,
    pub chain_id: u64,
    pub detected_at: i64,
    pub from_block: u64,
    pub to_block: u64,
    pub orphaned_hash: String,
    pub canonical_hash: String,
    pub ancestor_block: u64,
    pub ancestor_hash: String,
    pub affected_blocks_count: u32,
}
