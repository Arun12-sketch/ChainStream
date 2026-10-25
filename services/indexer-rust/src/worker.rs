use crate::abi::AbiDecoder;
use crate::checkpoint::CheckpointManager;
use crate::metrics::MetricsRegistry;
use crate::publisher::EventPublisher;
use crate::reorg::ReorgDetector;
use crate::rpc::ResilientRpcClient;
use crate::types::{BlockMessage, ChainConfig, EventLogMessage, TransactionMessage};
use std::sync::Arc;
use std::time::Duration;
use tokio_postgres::Client as PgClient;
use tracing::{debug, error, info, warn};

pub struct ChainWorker {
    pub config: ChainConfig,
    pub rpc_client: ResilientRpcClient,
    pub checkpoint_mgr: CheckpointManager,
    pub reorg_detector: ReorgDetector,
    pub abi_decoder: AbiDecoder,
    pub publisher: Arc<EventPublisher>,
    pub metrics: Arc<MetricsRegistry>,
    pub pg_client: Option<Arc<PgClient>>,
}

impl ChainWorker {
    pub fn new(
        config: ChainConfig,
        worker_id: String,
        publisher: Arc<EventPublisher>,
        metrics: Arc<MetricsRegistry>,
        pg_client: Option<Arc<PgClient>>,
        enable_simulation: bool,
    ) -> Self {
        let rpc_client = ResilientRpcClient::new(
            config.chain_id,
            config.rpc_url.clone(),
            config.fallback_rpc_urls.clone(),
            enable_simulation,
        );

        let checkpoint_mgr = CheckpointManager::new(config.chain_id, worker_id);
        let reorg_detector = ReorgDetector::new(config.chain_id, 32);
        let abi_decoder = AbiDecoder::new();

        Self {
            config,
            rpc_client,
            checkpoint_mgr,
            reorg_detector,
            abi_decoder,
            publisher,
            metrics,
            pg_client,
        }
    }

    pub async fn run(&self) {
        info!(
            chain_id = self.config.chain_id,
            name = %self.config.name,
            "Starting chain indexer worker loop"
        );

        let chain_str = self.config.chain_id.to_string();

        // 1. Initial Checkpoint Recovery
        let mut current_block = if let Some(pg) = &self.pg_client {
            match self.checkpoint_mgr.load_last_checkpoint(pg).await {
                Ok((block, hash)) if block > 0 => {
                    info!(
                        chain_id = self.config.chain_id,
                        resumed_block = block,
                        hash = %hash,
                        "Resumed from persistent checkpoint"
                    );
                    block
                }
                _ => self.config.start_block.unwrap_or(0),
            }
        } else {
            self.config.start_block.unwrap_or(0)
        };

        // If starting from 0, initialize near chain tip or configured start block
        if current_block == 0 {
            if let Ok(tip) = self.rpc_client.get_block_number().await {
                current_block = tip.saturating_sub(self.config.confirmation_depth);
                info!(
                    chain_id = self.config.chain_id,
                    tip,
                    current_block,
                    "Initialized indexing checkpoint near chain tip"
                );
            } else {
                current_block = 1000;
            }
        }

        loop {
            // Lease renewal & coordination
            if let Some(pg) = &self.pg_client {
                match self.checkpoint_mgr.acquire_or_renew_lease(pg, 30).await {
                    Ok(true) => {}
                    Ok(false) => {
                        tokio::time::sleep(Duration::from_millis(self.config.poll_interval_ms)).await;
                        continue;
                    }
                    Err(e) => {
                        warn!(chain_id = self.config.chain_id, error = %e, "Lease check error; continuing");
                    }
                }
            }

            // Fetch latest head from RPC
            let latest_head = match self.rpc_client.get_block_number().await {
                Ok(h) => h,
                Err(e) => {
                    warn!(chain_id = self.config.chain_id, error = %e, "Failed to get latest block number");
                    tokio::time::sleep(Duration::from_millis(self.config.poll_interval_ms)).await;
                    continue;
                }
            };

            let lag = latest_head.saturating_sub(current_block);
            self.metrics
                .lag_blocks
                .with_label_values(&[&chain_str])
                .set(lag as f64);

            let safe_target = latest_head.saturating_sub(self.config.confirmation_depth);

            if current_block >= safe_target && lag == 0 {
                // At tip of confirmed blocks, wait for next block interval
                tokio::time::sleep(Duration::from_millis(self.config.poll_interval_ms)).await;
                continue;
            }

            let next_block = current_block + 1;

            // Fetch block details
            let block_res = self.rpc_client.get_block_by_number(next_block, true).await;
            let rpc_block = match block_res {
                Ok(b) => b,
                Err(e) => {
                    warn!(chain_id = self.config.chain_id, block = next_block, error = %e, "Failed to fetch block");
                    tokio::time::sleep(Duration::from_millis(500)).await;
                    continue;
                }
            };

            let block_hash = rpc_block.hash.clone().unwrap_or_else(|| format!("0x{:064x}", next_block));
            let parent_hash = rpc_block.parent_hash.clone().unwrap_or_default();

            // Reorganization check
            if let Some(false) = self.reorg_detector.check_parent_match(next_block, &parent_hash).await {
                self.metrics
                    .reorg_count
                    .with_label_values(&[&chain_str])
                    .inc();

                let pg_opt = self.pg_client.as_deref();
                match self.reorg_detector.reconcile_reorg(next_block, &block_hash, &parent_hash, &self.rpc_client, pg_opt).await {
                    Ok(reorg_msg) => {
                        let _ = self.publisher.publish_reorg(&reorg_msg).await;
                        current_block = reorg_msg.ancestor_block;
                        info!(
                            chain_id = self.config.chain_id,
                            rewound_to = current_block,
                            "Rewound indexer to canonical ancestor after reorg"
                        );
                        continue;
                    }
                    Err(e) => {
                        error!(chain_id = self.config.chain_id, error = %e, "Reorg reconciliation failure");
                    }
                }
            }

            // Parse block metadata
            let timestamp = rpc_block.timestamp.as_deref()
                .and_then(|t| i64::from_str_radix(t.trim_start_matches("0x"), 16).ok())
                .unwrap_or_else(|| chrono::Utc::now().timestamp());

            let block_msg = BlockMessage {
                version: "v1".to_string(),
                chain_id: self.config.chain_id,
                block_number: next_block,
                block_hash: block_hash.clone(),
                parent_hash: parent_hash.clone(),
                timestamp,
                tx_count: rpc_block.transactions.len() as u32,
                gas_used: rpc_block.gas_used.clone().unwrap_or_else(|| "0".to_string()),
                gas_limit: rpc_block.gas_limit.clone().unwrap_or_else(|| "30000000".to_string()),
                base_fee_per_gas: rpc_block.base_fee_per_gas.clone().unwrap_or_else(|| "1000000000".to_string()),
                is_canonical: true,
                confirmation_depth: self.config.confirmation_depth,
            };

            // Publish Block
            let _ = self.publisher.publish_block(&block_msg).await;
            self.metrics
                .blocks_indexed
                .with_label_values(&[&chain_str])
                .inc();

            // Process Transactions & Decoded Events
            for (idx, tx) in rpc_block.transactions.iter().enumerate() {
                let tx_msg = TransactionMessage {
                    version: "v1".to_string(),
                    chain_id: self.config.chain_id,
                    tx_hash: tx.hash.clone(),
                    block_number: next_block,
                    block_hash: block_hash.clone(),
                    tx_index: idx as u32,
                    from_address: tx.from.clone(),
                    to_address: tx.to.clone(),
                    value: tx.value.clone().unwrap_or_else(|| "0".to_string()),
                    gas_price: tx.gas_price.clone().unwrap_or_else(|| "0".to_string()),
                    gas_used: tx.gas.clone().unwrap_or_else(|| "21000".to_string()),
                    status: 1,
                    input_data: tx.input.clone().unwrap_or_else(|| "0x".to_string()),
                    is_canonical: true,
                };

                let _ = self.publisher.publish_transaction(&tx_msg).await;
                self.metrics
                    .txs_indexed
                    .with_label_values(&[&chain_str])
                    .inc();

                // If input data contains ERC20 transfer signature (0xa9059cbb), decode synthetic event
                if let Some(input) = &tx.input {
                    if input.starts_with("0xa9059cbb") && input.len() >= 74 {
                        let to_param = format!("0x{}", &input[34..74]);
                        let val_param = AbiDecoder::decode_u256_from_data(input, 1);
                        let contract_addr = tx.to.clone().unwrap_or_default();

                        let log_msg = EventLogMessage {
                            version: "v1".to_string(),
                            chain_id: self.config.chain_id,
                            log_index: idx as u32,
                            tx_hash: tx.hash.clone(),
                            block_number: next_block,
                            block_hash: block_hash.clone(),
                            contract_address: contract_addr,
                            event_name: Some("Transfer".to_string()),
                            event_signature: Some("Transfer(address,address,uint256)".to_string()),
                            topic0: Some("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef".to_string()),
                            topic1: Some(format!("0x000000000000000000000000{}", tx.from.trim_start_matches("0x"))),
                            topic2: Some(format!("0x000000000000000000000000{}", to_param.trim_start_matches("0x"))),
                            topic3: None,
                            raw_data: format!("0x{:0>64}", val_param),
                            decoded_params: Some(serde_json::json!({
                                "from": tx.from,
                                "to": to_param,
                                "value": val_param
                            })),
                            is_canonical: true,
                        };

                        let _ = self.publisher.publish_event(&log_msg).await;
                        self.metrics
                            .events_decoded
                            .with_label_values(&[&chain_str])
                            .inc();
                    }
                }
            }

            // Record canonical block in reorg memory history
            self.reorg_detector
                .record_canonical_block(next_block, block_hash.clone(), parent_hash)
                .await;

            // Commit persistent checkpoint with fencing token
            if let Some(pg) = &self.pg_client {
                let _ = self.checkpoint_mgr.commit_checkpoint(pg, next_block, &block_hash).await;
            }

            current_block = next_block;

            // Bounded sleep if catching up
            if lag > 10 {
                tokio::time::sleep(Duration::from_millis(50)).await;
            } else {
                tokio::time::sleep(Duration::from_millis(self.config.poll_interval_ms)).await;
            }
        }
    }
}
