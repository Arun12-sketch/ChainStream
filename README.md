# ChainStream — Production-Grade Multi-Chain Blockchain Indexer

[![CI/CD Pipeline](https://github.com/chainstream/chainstream/actions/workflows/ci.yml/badge.svg)](https://github.com/chainstream/chainstream/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.80+-orange.svg)](https://www.rust-lang.org/)
[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8.svg)](https://golang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)

**ChainStream** is a high-performance, fault-tolerant, multi-chain blockchain indexing platform that ingests on-chain events from multiple EVM-compatible blockchains, processes them through a distributed streaming pipeline, and exposes normalized blockchain data through low-latency REST APIs and WebSocket subscriptions.

---

## Architecture Overview

```text
RPC Providers (Sepolia, Base, Amoy)
        │
        ▼ (HTTP / WebSocket)
Rust Ingestion Engine (Tokio, Alloy ABI Decoder, Reorg Reconciliation)
        │
        ├─────────────────────────────┬───────────────────────────┐
        ▼ (Partition Ordered)         ▼ (Direct Storage)          ▼ (Pub/Sub)
  Apache Kafka                  PostgreSQL 16 Storage        Redis 7 Cluster
 (blocks, txs, events, reorgs)   (Composite Unique Keys)      (Real-time fanout)
        │                             │                           │
        ▼                             │                           │
Event Processor (Rust) ───────────────┘                           │
                                      │                           │
                                      ▼                           ▼
                             Go API Gateway & WebSocket Query Service
                                      │
                                      ▼
                        Next.js Control Center Dashboard
```

---

## Key Features

1. **Multi-Chain Ingestion**:
   - Out-of-the-box support for **Ethereum Sepolia (11155111)**, **Base Sepolia (84532)**, and **Polygon Amoy (80002)**.
   - Configurable RPC providers, fallback endpoints, exponential backoff, jitter, and circuit breakers.

2. **Blockchain Reorganization Handling**:
   - Real-time parent hash mismatch detection.
   - Traces backwards to find common ancestors across forks.
   - Atomically updates orphaned blocks, transactions, and logs to `is_canonical = false`.
   - Records reorganization audits into `reorg_history` and rewinds checkpoints safely.

3. **Distributed Coordination & Fencing Tokens**:
   - Lease-based distributed locking in PostgreSQL prevents split-brain workers.
   - Monotonic fencing tokens reject stale or zombie worker commits.

4. **Normalized Event Decoding**:
   - Decodes standard EVM event signatures (`Transfer`, `Approval`, `Swap`, `Mint`, etc.) into structured JSON parameters.
   - Normalizes heterogeneous chain receipts into a single JSON schema.

5. **High-Performance Go API Gateway**:
   - REST endpoints with stable cursor-based pagination.
   - Gorilla WebSocket hub with bounded queues (128 msgs) and slow-consumer protection.
   - SHA-256 API key authentication and per-key token-bucket rate limiting.
   - Built-in Swagger UI documentation at `/docs` and OpenAPI JSON at `/api/openapi.json`.

6. **ChainStream Control Center Dashboard**:
   - Production Next.js 14 App Router dashboard themed in **Midnight Infrastructure + Electric Cyan**.
   - Landing page `/` with architecture visualization and telemetry preview.
   - Real-time Recharts throughput and latency graphs.
   - Explorers for Blocks, Transactions, Decoded Events, and Live WebSocket Streams.
   - Interactive Developer API Playground with cURL, JavaScript, and Go code generators.

---

## Monorepo Structure

```text
chainstream/
├── services/
│   ├── indexer-rust/           # Core Rust blockchain ingestion engine
│   ├── event-processor-rust/   # Kafka stream consumer & processor
│   ├── api-go/                 # Go API gateway, REST, & WebSocket hub
│   └── dashboard/              # Next.js 14 Control Center dashboard
├── packages/
│   ├── event-schema/           # JSON schema definitions (v1)
│   └── test-fixtures/          # Deterministic 3-block reorg test fixture
├── migrations/                 # PostgreSQL schema & seed migrations
├── contracts/abis/             # ERC-20 & Uniswap V3 Pool contract ABIs
├── deployments/
│   ├── docker/                 # Container configs
│   ├── kubernetes/             # K8s Deployments, Services, Ingress, HPA, PDB
│   └── terraform/              # AWS EKS, MSK Kafka, RDS, ElastiCache
├── tests/
│   ├── integration/            # E2E pipeline verification script
│   └── reorg/                  # Blockchain reorg fixture tests
├── observability/
│   ├── prometheus/             # Prometheus scraping config
│   └── grafana/                # Grafana cluster dashboard
├── docs/                       # Architecture, reorg, and deployment guides
├── docker-compose.yml          # Complete local development stack
├── Makefile                    # Developer task runner
├── .env.example                # Configuration template
└── README.md
```

---

## Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- [Rust](https://www.rust-lang.org/) (v1.75+)
- [Go](https://golang.org/) (v1.22+)
- [Node.js](https://nodejs.org/) (v20+)

### 1. Launch Local Environment

```bash
# Clone the repository
git clone https://github.com/chainstream/chainstream.git
cd chainstream

# Copy environment variables
cp .env.example .env

# Start PostgreSQL, Redis, Kafka, Indexer, API, and Dashboard
make dev
```

### 2. Access Services
- **Control Center Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Go API Gateway**: [http://localhost:8080](http://localhost:8080)
- **OpenAPI / Swagger UI Docs**: [http://localhost:8080/docs](http://localhost:8080/docs)
- **Rust Indexer Metrics**: [http://localhost:9090/metrics](http://localhost:9090/metrics)
- **Prometheus UI**: [http://localhost:9099](http://localhost:9099)

---

## API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/healthz` | API liveness probe |
| `GET` | `/readyz` | API readiness probe (checks DB connectivity) |
| `GET` | `/metrics` | Prometheus metrics scrape target |
| `GET` | `/docs` | Interactive Swagger UI API documentation |
| `GET` | `/api/v1/chains` | List supported EVM blockchains |
| `GET` | `/api/v1/chains/{chainId}/stats` | Aggregate indexing throughput, lag, and reorg counts |
| `GET` | `/api/v1/chains/{chainId}/blocks` | Cursor-paginated block headers (filter canonical/orphaned) |
| `GET` | `/api/v1/chains/{chainId}/blocks/latest` | Latest canonical block |
| `GET` | `/api/v1/chains/{chainId}/transactions` | Cursor-paginated transactions |
| `GET` | `/api/v1/chains/{chainId}/events` | Decoded contract events (filter by contract/event signature) |
| `GET` | `/api/v1/workers` | Active indexer worker leases and fencing tokens |
| `GET` | `/api/v1/infrastructure` | Health status of all platform dependencies |
| `GET` | `/api/v1/reorgs` | Blockchain reorganization audit log |
| `GET` | `/api/v1/keys` | List managed API keys |
| `POST`| `/api/v1/keys` | Generate a new API key with rate limits |
| `GET` | `/api/v1/ws` | Real-time WebSocket subscription for blocks and decoded events |

---

## Running Tests

Run the complete automated test suite across Rust, Go, and the Reorganization engine:

```bash
# Run all unit and integration tests
make test

# Or run the comprehensive end-to-end pipeline test
make test-e2e
```

---

## License

MIT © ChainStream Contributors.
