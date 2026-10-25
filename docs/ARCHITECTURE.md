# ChainStream — System Architecture & Distributed Engineering

ChainStream is an enterprise-grade multi-chain blockchain indexing platform designed to ingest, normalize, and expose on-chain events across EVM networks (Ethereum Sepolia, Base Sepolia, Polygon Amoy) with sub-second latency and zero data loss.

## High-Level Data Flow

```text
  ┌─────────────────────────────────────────────────────────────┐
  │                 EVM Blockchain Networks                     │
  │     (Ethereum Sepolia, Base Sepolia, Polygon Amoy)          │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ HTTP & WebSocket RPC
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │              Rust Core Indexing Engine                      │
  │  - Async Tokio Worker Tasks (1 worker / chain)              │
  │  - Resilient RPC Client with Circuit Breakers & Retries     │
  │  - Reorganization Detector & Common Ancestor Resolver       │
  │  - EVM Smart Contract ABI Event Decoder                     │
  │  - Distributed Checkpoint & Fencing Token Coordination     │
  └──────────────┬──────────────────────────────┬───────────────┘
                 │ Kafka Record Publishing      │ Direct Storage Fallback
                 ▼                              ▼
  ┌──────────────────────────────┐ ┌────────────────────────────┐
  │        Apache Kafka          │ │     Redis 7 Cluster        │
  │  - chainstream.blocks        │ │  - Real-time Pub/Sub       │
  │  - chainstream.transactions  │ │  - Token bucket rate-limit │
  │  - chainstream.events        │ └────────────┬───────────────┘
  │  - chainstream.reorgs        │              │
  └──────────────┬───────────────┘              │
                 │ Consumer Groups              │
                 ▼                              │
  ┌──────────────────────────────┐              │
  │   Event Processor (Rust)     │              │
  │  - Idempotent DB Persist     │              │
  │  - DLQ Handling & Offsets    │              │
  └──────────────┬───────────────┘              │
                 ▼                              │
  ┌─────────────────────────────────────────────┴───────────────┐
  │                   PostgreSQL 16 Storage                     │
  │  - Normalized Tables: blocks, transactions, event_logs      │
  │  - Checkpoints with Fencing Tokens (split-brain prevention) │
  │  - Reorganization History & API Keys                        │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ Connection Pooling
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                 Go API Gateway & Query Service              │
  │  - REST Endpoints with Cursor-based Pagination              │
  │  - Gorilla WebSocket Hub with Bounded Queues                │
  │  - API Key Authentication & Per-Key Rate Limiting           │
  │  - Prometheus /metrics and OpenAPI /docs (Swagger UI)       │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ HTTP / WS
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │           Next.js Control Center Dashboard                  │
  │  - Real-time KPI Telemetry & Recharts Graphs                │
  │  - Block, Transaction, and Decoded Event Explorers          │
  │  - Interactive Live Event Terminal                          │
  │  - API Playground with cURL, JS, & Go Code Generators       │
  └─────────────────────────────────────────────────────────────┘
```

## Distributed Guarantees & Consistency

1. **At-Least-Once Delivery with Idempotency**:
   - All PostgreSQL writes utilize composite uniqueness keys:
     - Blocks: `(chain_id, block_number, block_hash)`
     - Transactions: `(chain_id, tx_hash, block_hash)`
     - Event Logs: `(chain_id, block_hash, tx_hash, log_index)`
   - Duplicate messages received from Kafka or RPC polling are safely resolved with `ON CONFLICT DO UPDATE`.

2. **Distributed Checkpointing & Fencing Tokens**:
   - Multiple worker instances use lease-based coordination recorded in `worker_leases`.
   - Each lease renewal increments a monotonic `fencing_token`.
   - Checkpoints committed to `indexer_checkpoints` require `fencing_token <= $token`. Stale or zombie workers experiencing stop-the-world pauses are automatically rejected by PostgreSQL, guaranteeing single-writer consistency.

3. **Memory Concurrency & Backpressure**:
   - Tokio workers process blocks in bounded batches (`max_batch_size = 5`).
   - WebSocket subscriber queues are capped at 128 messages. Slow clients failing to consume within deadline are disconnected safely to protect cluster memory.
