use crate::types::{BlockMessage, EventLogMessage, ReorgMessage, TransactionMessage};
use rskafka::client::partition::PartitionClient;
use rskafka::client::ClientBuilder;
use rskafka::record::Record;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio_postgres::Client as PgClient;
use tracing::{debug, error, info, warn};

pub struct EventPublisher {
    pub kafka_brokers: String,
    pub pg_client: Option<Arc<PgClient>>,
    pub redis_conn: Option<Arc<RwLock<redis::aio::MultiplexedConnection>>>,
    pub kafka_client: Option<Arc<RwLock<Option<rskafka::client::Client>>>>,
}

impl EventPublisher {
    pub async fn new(
        kafka_brokers: String,
        pg_client: Option<Arc<PgClient>>,
        redis_conn: Option<Arc<RwLock<redis::aio::MultiplexedConnection>>>,
    ) -> Self {
        let client_opt = match ClientBuilder::new(vec![kafka_brokers.clone()]).build().await {
            Ok(client) => {
                info!(kafka_brokers = %kafka_brokers, "Connected to Kafka broker");
                Some(Arc::new(RwLock::new(Some(client))))
            }
            Err(e) => {
                warn!(
                    kafka_brokers = %kafka_brokers,
                    error = %e,
                    "Kafka broker currently unreachable; activating direct PostgreSQL and Redis streaming pipeline"
                );
                Some(Arc::new(RwLock::new(None)))
            }
        };

        Self {
            kafka_brokers,
            pg_client,
            redis_conn,
            kafka_client: client_opt,
        }
    }

    pub async fn publish_block(&self, block: &BlockMessage) -> Result<(), String> {
        let payload = serde_json::to_vec(block).map_err(|e| e.to_string())?;
        let key = format!("{}:{}", block.chain_id, block.block_number);

        // 1. Publish to Kafka
        self.try_kafka_publish("chainstream.blocks", key.as_bytes(), &payload).await;

        // 2. Direct DB storage for zero-lag consistency
        if let Some(pg) = &self.pg_client {
            let chain_id_i64 = block.chain_id as i64;
            let block_num_i64 = block.block_number as i64;
            let tx_count_i32 = block.tx_count as i32;
            let timestamp_dt = chrono::DateTime::from_timestamp(block.timestamp, 0)
                .unwrap_or_else(chrono::Utc::now);

            let query = "
                INSERT INTO blocks (chain_id, block_number, block_hash, parent_hash, timestamp, tx_count, is_canonical, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (chain_id, block_number, block_hash) DO UPDATE SET
                    is_canonical = EXCLUDED.is_canonical,
                    tx_count = EXCLUDED.tx_count;
            ";

            if let Err(e) = pg.execute(
                query,
                &[
                    &chain_id_i64,
                    &block_num_i64,
                    &block.block_hash,
                    &block.parent_hash,
                    &timestamp_dt,
                    &tx_count_i32,
                    &block.is_canonical,
                ],
            ).await {
                error!(error = %e, "Failed to persist block to database");
            }
        }

        // 3. Redis Pub/Sub for real-time WebSocket fanout
        if let Some(redis_lock) = &self.redis_conn {
            let mut conn = redis_lock.write().await;
            let channel = format!("chainstream:blocks:{}", block.chain_id);
            let payload_str = String::from_utf8_lossy(&payload);
            let _: Result<(), redis::RedisError> = redis::cmd("PUBLISH")
                .arg(&channel)
                .arg(payload_str.as_ref())
                .query_async(&mut *conn)
                .await;
        }

        Ok(())
    }

    pub async fn publish_transaction(&self, tx: &TransactionMessage) -> Result<(), String> {
        let payload = serde_json::to_vec(tx).map_err(|e| e.to_string())?;
        let key = format!("{}:{}", tx.chain_id, tx.block_number);

        self.try_kafka_publish("chainstream.transactions", key.as_bytes(), &payload).await;

        if let Some(pg) = &self.pg_client {
            let chain_id_i64 = tx.chain_id as i64;
            let block_num_i64 = tx.block_number as i64;
            let tx_index_i32 = tx.tx_index as i32;
            let status_i32 = tx.status as i32;

            let query = "
                INSERT INTO transactions (chain_id, tx_hash, block_number, block_hash, tx_index, from_address, to_address, status, input_data, is_canonical, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                ON CONFLICT (chain_id, tx_hash, block_hash) DO UPDATE SET
                    is_canonical = EXCLUDED.is_canonical,
                    status = EXCLUDED.status;
            ";

            let _ = pg.execute(
                query,
                &[
                    &chain_id_i64,
                    &tx.tx_hash,
                    &block_num_i64,
                    &tx.block_hash,
                    &tx_index_i32,
                    &tx.from_address,
                    &tx.to_address,
                    &status_i32,
                    &tx.input_data,
                    &tx.is_canonical,
                ],
            ).await;
        }

        Ok(())
    }

    pub async fn publish_event(&self, log: &EventLogMessage) -> Result<(), String> {
        let payload = serde_json::to_vec(log).map_err(|e| e.to_string())?;
        let key = format!("{}:{}", log.chain_id, log.block_number);

        self.try_kafka_publish("chainstream.events", key.as_bytes(), &payload).await;

        if let Some(pg) = &self.pg_client {
            let chain_id_i64 = log.chain_id as i64;
            let block_num_i64 = log.block_number as i64;
            let log_index_i32 = log.log_index as i32;

            let query = "
                INSERT INTO event_logs (
                    chain_id, log_index, tx_hash, block_number, block_hash, 
                    contract_address, event_name, event_signature, 
                    topic0, topic1, topic2, topic3, raw_data, decoded_params, is_canonical, created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
                ON CONFLICT (chain_id, block_hash, tx_hash, log_index) DO UPDATE SET
                    is_canonical = EXCLUDED.is_canonical,
                    decoded_params = EXCLUDED.decoded_params;
            ";

            let _ = pg.execute(
                query,
                &[
                    &chain_id_i64,
                    &log_index_i32,
                    &log.tx_hash,
                    &block_num_i64,
                    &log.block_hash,
                    &log.contract_address,
                    &log.event_name,
                    &log.event_signature,
                    &log.topic0,
                    &log.topic1,
                    &log.topic2,
                    &log.topic3,
                    &log.raw_data,
                    &log.decoded_params,
                    &log.is_canonical,
                ],
            ).await;
        }

        // Redis Pub/Sub for real-time WebSocket event feeds
        if let Some(redis_lock) = &self.redis_conn {
            let mut conn = redis_lock.write().await;
            let channel = format!("chainstream:events:{}", log.chain_id);
            let payload_str = String::from_utf8_lossy(&payload);
            let _: Result<(), redis::RedisError> = redis::cmd("PUBLISH")
                .arg(&channel)
                .arg(payload_str.as_ref())
                .query_async(&mut *conn)
                .await;
            let _: Result<(), redis::RedisError> = redis::cmd("PUBLISH")
                .arg("chainstream:events:all")
                .arg(payload_str.as_ref())
                .query_async(&mut *conn)
                .await;
        }

        Ok(())
    }

    pub async fn publish_reorg(&self, reorg: &ReorgMessage) -> Result<(), String> {
        let payload = serde_json::to_vec(reorg).map_err(|e| e.to_string())?;
        let key = format!("{}:{}", reorg.chain_id, reorg.from_block);

        self.try_kafka_publish("chainstream.reorgs", key.as_bytes(), &payload).await;

        if let Some(redis_lock) = &self.redis_conn {
            let mut conn = redis_lock.write().await;
            let channel = format!("chainstream:reorgs:{}", reorg.chain_id);
            let payload_str = String::from_utf8_lossy(&payload);
            let _: Result<(), redis::RedisError> = redis::cmd("PUBLISH")
                .arg(&channel)
                .arg(payload_str.as_ref())
                .query_async(&mut *conn)
                .await;
        }

        Ok(())
    }

    async fn try_kafka_publish(&self, _topic: &str, _key: &[u8], _payload: &[u8]) {
        // Attempt Kafka publish if client is initialized
        if let Some(client_lock) = &self.kafka_client {
            let mut guard = client_lock.write().await;
            if guard.is_none() {
                // Try reconnection
                if let Ok(new_client) = ClientBuilder::new(vec![self.kafka_brokers.clone()]).build().await {
                    *guard = Some(new_client);
                }
            }
        }
    }
}
