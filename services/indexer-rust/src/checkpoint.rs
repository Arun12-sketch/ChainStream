use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Arc;
use tokio_postgres::Client as PgClient;
use tracing::{debug, error, info, warn};

#[derive(Clone)]
pub struct CheckpointManager {
    pub chain_id: u64,
    pub worker_id: String,
    pub fencing_token: Arc<AtomicI64>,
}

impl CheckpointManager {
    pub fn new(chain_id: u64, worker_id: String) -> Self {
        Self {
            chain_id,
            worker_id,
            fencing_token: Arc::new(AtomicI64::new(1)),
        }
    }

    pub async fn acquire_or_renew_lease(
        &self,
        pg_client: &PgClient,
        lease_duration_secs: i64,
    ) -> Result<bool, String> {
        let chain_id_i64 = self.chain_id as i64;

        // Try to acquire an expired lease or renew our own lease
        let query = "
            INSERT INTO worker_leases (chain_id, worker_id, fencing_token, lease_expires_at, heartbeat_at)
            VALUES ($1, $2, 1, NOW() + ($3 || ' seconds')::INTERVAL, NOW())
            ON CONFLICT (chain_id) DO UPDATE SET
                worker_id = CASE 
                    WHEN worker_leases.lease_expires_at < NOW() OR worker_leases.worker_id = $2 
                    THEN $2 
                    ELSE worker_leases.worker_id 
                END,
                fencing_token = CASE 
                    WHEN worker_leases.lease_expires_at < NOW() AND worker_leases.worker_id != $2 
                    THEN worker_leases.fencing_token + 1 
                    ELSE worker_leases.fencing_token 
                END,
                lease_expires_at = CASE 
                    WHEN worker_leases.lease_expires_at < NOW() OR worker_leases.worker_id = $2 
                    THEN NOW() + ($3 || ' seconds')::INTERVAL 
                    ELSE worker_leases.lease_expires_at 
                END,
                heartbeat_at = CASE 
                    WHEN worker_leases.lease_expires_at < NOW() OR worker_leases.worker_id = $2 
                    THEN NOW() 
                    ELSE worker_leases.heartbeat_at 
                END
            RETURNING worker_id, fencing_token;
        ";

        let duration_str = lease_duration_secs.to_string();
        let rows = pg_client
            .query(query, &[&chain_id_i64, &self.worker_id, &duration_str])
            .await
            .map_err(|e| format!("Failed to update worker lease: {}", e))?;

        if let Some(row) = rows.get(0) {
            let active_worker: String = row.get(0);
            let token: i64 = row.get(1);

            if active_worker == self.worker_id {
                self.fencing_token.store(token, Ordering::Relaxed);
                debug!(
                    chain_id = self.chain_id,
                    worker_id = %self.worker_id,
                    fencing_token = token,
                    "Worker lease acquired/renewed successfully"
                );
                return Ok(true);
            } else {
                warn!(
                    chain_id = self.chain_id,
                    active_worker = %active_worker,
                    my_id = %self.worker_id,
                    "Worker lease held by another active worker; idling"
                );
                return Ok(false);
            }
        }

        Ok(false)
    }

    pub async fn load_last_checkpoint(&self, pg_client: &PgClient) -> Result<(u64, String), String> {
        let chain_id_i64 = self.chain_id as i64;
        let query = "SELECT last_indexed_block, last_indexed_hash FROM indexer_checkpoints WHERE chain_id = $1";

        let rows = pg_client
            .query(query, &[&chain_id_i64])
            .await
            .map_err(|e| format!("Failed to read checkpoint: {}", e))?;

        if let Some(row) = rows.get(0) {
            let block: i64 = row.get(0);
            let hash: String = row.get(1);
            Ok((block as u64, hash))
        } else {
            Ok((0, "".to_string()))
        }
    }

    pub async fn commit_checkpoint(
        &self,
        pg_client: &PgClient,
        block_number: u64,
        block_hash: &str,
    ) -> Result<bool, String> {
        let chain_id_i64 = self.chain_id as i64;
        let block_i64 = block_number as i64;
        let current_token = self.fencing_token.load(Ordering::Relaxed);

        let query = "
            INSERT INTO indexer_checkpoints (chain_id, last_indexed_block, last_indexed_hash, fencing_token, worker_id, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (chain_id) DO UPDATE SET
                last_indexed_block = $2,
                last_indexed_hash = $3,
                fencing_token = $4,
                worker_id = $5,
                updated_at = NOW()
            WHERE indexer_checkpoints.fencing_token <= $4;
        ";

        let affected = pg_client
            .execute(
                query,
                &[
                    &chain_id_i64,
                    &block_i64,
                    &block_hash,
                    &current_token,
                    &self.worker_id,
                ],
            )
            .await
            .map_err(|e| format!("Failed to commit checkpoint: {}", e))?;

        if affected == 0 {
            warn!(
                chain_id = self.chain_id,
                current_token,
                "Checkpoint write rejected by fencing token check! Stale worker detected."
            );
            return Ok(false);
        }

        debug!(
            chain_id = self.chain_id,
            block_number,
            block_hash,
            fencing_token = current_token,
            "Committed indexer checkpoint"
        );
        Ok(true)
    }
}
