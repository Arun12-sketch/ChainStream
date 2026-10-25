# Blockchain Reorganization & Canonical Reconciliation

In EVM blockchains, transient network partitions and validator forks routinely cause chain reorganizations (reorgs). If an indexer blindly stores blocks without verifying parent linkage, it exposes stale or orphaned transactions and invalid smart contract state to downstream clients.

## 7-Step Reconciliation Algorithm

ChainStream implements a deterministic chain reconciliation process inside the Rust indexing engine (`services/indexer-rust/src/reorg.rs`):

1. **Header Tracking**:
   The indexer maintains an in-memory ring buffer of recent canonical block headers (`hash`, `parent_hash`, `number`).

2. **Parent Hash Validation**:
   When receiving block $N$, the indexer checks whether `new_block.parent_hash == canonical_blocks[N - 1].hash`.
   - If they match, the block is canonical and ingested.
   - If they mismatch, a **Chain Reorganization is triggered**.

3. **Common Ancestor Resolution**:
   The engine walks backwards through block hashes using `eth_getBlockByHash` until it finds the common ancestor block $A$ where:
   $$\text{fork\_block}[A].\text{parent\_hash} == \text{stored\_canonical}[A].\text{parent\_hash}$$

4. **Atomic Database Invalidation**:
   Inside an atomic database transaction:
   ```sql
   UPDATE blocks SET is_canonical = false 
   WHERE chain_id = $1 AND block_number > $ancestor AND is_canonical = true;

   UPDATE transactions SET is_canonical = false 
   WHERE chain_id = $1 AND block_number > $ancestor AND is_canonical = true;

   UPDATE event_logs SET is_canonical = false 
   WHERE chain_id = $1 AND block_number > $ancestor AND is_canonical = true;
   ```

5. **Audit History Recording**:
   Records the reorg event into `reorg_history` with `from_block`, `to_block`, `orphaned_hash`, `canonical_hash`, `ancestor_block`, and `affected_blocks_count`.

6. **Checkpoint Rewind**:
   Rewinds `indexer_checkpoints.last_indexed_block` to $A$.

7. **Canonical Fork Ingestion**:
   The worker restarts ingestion from $A + 1$ on the new canonical fork, publishes a `ReorgMessage` to Kafka topic `chainstream.reorgs`, and updates downstream WebSocket subscribers.
