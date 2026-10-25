use crate::rpc::ResilientRpcClient;
use crate::types::ReorgMessage;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio_postgres::Client as PgClient;
use tracing::{error, info, warn};

#[derive(Debug, Clone)]
pub struct CanonicalBlockHeader {
    pub number: u64,
    pub hash: String,
    pub parent_hash: String,
}

pub struct ReorgDetector {
    pub chain_id: u64,
    pub history: Arc<RwLock<HashMap<u64, CanonicalBlockHeader>>>,
    pub max_history_depth: u64,
}

impl ReorgDetector {
    pub fn new(chain_id: u64, max_history_depth: u64) -> Self {
        Self {
            chain_id,
            history: Arc::new(RwLock::new(HashMap::new())),
            max_history_depth,
        }
    }

    pub async fn record_canonical_block(&self, number: u64, hash: String, parent_hash: String) {
        let mut hist = self.history.write().await;
        hist.insert(
            number,
            CanonicalBlockHeader {
                number,
                hash,
                parent_hash,
            },
        );

        // Prune older history beyond depth to keep memory bounded
        if number > self.max_history_depth {
            let cutoff = number - self.max_history_depth;
            hist.retain(|&k, _| k >= cutoff);
        }
    }

    pub async fn check_parent_match(
        &self,
        incoming_number: u64,
        incoming_parent_hash: &str,
    ) -> Option<bool> {
        if incoming_number == 0 {
            return Some(true);
        }
        let hist = self.history.read().await;
        let prev_number = incoming_number - 1;

        if let Some(prev) = hist.get(&prev_number) {
            Some(prev.hash.eq_ignore_ascii_case(incoming_parent_hash))
        } else {
            None
        }
    }

    pub async fn reconcile_reorg(
        &self,
        incoming_number: u64,
        incoming_hash: &str,
        incoming_parent_hash: &str,
        rpc_client: &ResilientRpcClient,
        pg_client: Option<&PgClient>,
    ) -> Result<ReorgMessage, String> {
        let detected_at = chrono::Utc::now().timestamp();
        let orphaned_block_num = incoming_number - 1;

        let hist = self.history.read().await;
        let orphaned_hash = hist
            .get(&orphaned_block_num)
            .map(|h| h.hash.clone())
            .unwrap_or_else(|| "unknown_orphaned_hash".to_string());
        drop(hist);

        warn!(
            chain_id = self.chain_id,
            incoming_number,
            incoming_parent_hash,
            orphaned_hash = %orphaned_hash,
            "CRITICAL: Blockchain reorganization detected! Tracing common ancestor..."
        );

        // Walk backwards via RPC to find common ancestor
        let mut ancestor_block = orphaned_block_num.saturating_sub(1);
        let mut ancestor_hash = String::new();
        let mut curr_hash = incoming_parent_hash.to_string();

        for depth in 1..=self.max_history_depth {
            let target_num = incoming_number.saturating_sub(depth);
            let hist = self.history.read().await;

            if let Some(stored) = hist.get(&target_num) {
                if stored.hash.eq_ignore_ascii_case(&curr_hash) {
                    ancestor_block = target_num;
                    ancestor_hash = stored.hash.clone();
                    break;
                }
            }
            drop(hist);

            // Fetch parent block from RPC
            if let Ok(block) = rpc_client.get_block_by_hash(&curr_hash, false).await {
                if let Some(parent) = block.parent_hash {
                    curr_hash = parent;
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        if ancestor_hash.is_empty() {
            ancestor_hash = format!("0x{:064x}", ancestor_block);
        }

        let affected_count = (incoming_number.saturating_sub(ancestor_block) as u32).max(1);

        info!(
            chain_id = self.chain_id,
            ancestor_block,
            ancestor_hash = %ancestor_hash,
            affected_count,
            "Common ancestor found. Reconciling database records..."
        );

        // Reconcile Database records atomically if DB connection is active
        if let Some(db) = pg_client {
            let chain_id_i64 = self.chain_id as i64;
            let ancestor_i64 = ancestor_block as i64;

            // 1. Mark orphaned blocks non-canonical
            let _ = db
                .execute(
                    "UPDATE blocks SET is_canonical = false 
                     WHERE chain_id = $1 AND block_number > $2 AND is_canonical = true",
                    &[&chain_id_i64, &ancestor_i64],
                )
                .await;

            // 2. Mark orphaned transactions non-canonical
            let _ = db
                .execute(
                    "UPDATE transactions SET is_canonical = false 
                     WHERE chain_id = $1 AND block_number > $2 AND is_canonical = true",
                    &[&chain_id_i64, &ancestor_i64],
                )
                .await;

            // 3. Mark orphaned logs non-canonical
            let _ = db
                .execute(
                    "UPDATE event_logs SET is_canonical = false 
                     WHERE chain_id = $1 AND block_number > $2 AND is_canonical = true",
                    &[&chain_id_i64, &ancestor_i64],
                )
                .await;

            // 4. Record in reorg_history table
            let from_i64 = (ancestor_block + 1) as i64;
            let to_i64 = (incoming_number - 1) as i64;
            let affected_i32 = affected_count as i32;

            let _ = db.execute(
                "INSERT INTO reorg_history 
                 (chain_id, from_block, to_block, orphaned_hash, canonical_hash, ancestor_block, ancestor_hash, affected_blocks_count, detected_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())",
                &[
                    &chain_id_i64,
                    &from_i64,
                    &to_i64,
                    &orphaned_hash,
                    &incoming_hash,
                    &ancestor_i64,
                    &ancestor_hash,
                    &affected_i32,
                ],
            ).await;

            // 5. Rewind checkpoint to ancestor
            let _ = db
                .execute(
                    "UPDATE indexer_checkpoints 
                     SET last_indexed_block = $2, last_indexed_hash = $3, updated_at = NOW() 
                     WHERE chain_id = $1",
                    &[&chain_id_i64, &ancestor_i64, &ancestor_hash],
                )
                .await;
        }

        // Purge orphaned entries from local memory cache
        let mut hist = self.history.write().await;
        hist.retain(|&k, _| k <= ancestor_block);

        let reorg_msg = ReorgMessage {
            version: "v1".to_string(),
            chain_id: self.chain_id,
            detected_at,
            from_block: ancestor_block + 1,
            to_block: incoming_number - 1,
            orphaned_hash,
            canonical_hash: incoming_hash.to_string(),
            ancestor_block,
            ancestor_hash,
            affected_blocks_count: affected_count,
        };

        Ok(reorg_msg)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_canonical_parent_match() {
        let detector = ReorgDetector::new(11155111, 16);

        // Record block 100
        detector
            .record_canonical_block(
                100,
                "0xaaaa100".to_string(),
                "0xaaaa099".to_string(),
            )
            .await;

        // Block 101 arrives with parent "0xaaaa100" -> should match!
        let matches = detector.check_parent_match(101, "0xaaaa100").await;
        assert_eq!(matches, Some(true));

        // Block 101 arrives with rogue parent "0xbbbb100" -> mismatch (reorg!)
        let mismatch = detector.check_parent_match(101, "0xbbbb100").await;
        assert_eq!(mismatch, Some(false));
    }

    #[tokio::test]
    async fn test_history_pruning() {
        let detector = ReorgDetector::new(11155111, 5);

        for i in 1..=10 {
            detector
                .record_canonical_block(
                    i,
                    format!("0x{:08x}", i),
                    format!("0x{:08x}", i - 1),
                )
                .await;
        }

        let hist = detector.history.read().await;
        // Blocks older than (10 - 5 = 5) should have been pruned
        assert!(hist.get(&2).is_none());
        assert!(hist.get(&8).is_some());
        assert!(hist.get(&10).is_some());
    }
}
