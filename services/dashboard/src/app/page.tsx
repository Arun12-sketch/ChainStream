import React from "react";
import Link from "next/link";
import {
  Activity,
  Layers,
  Radio,
  RefreshCw,
  Server,
  Zap,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Database,
  ExternalLink,
  ChevronRight,
  Terminal,
  Globe,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ChainBadge } from "@/components/ChainBadge";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary selection:bg-accent-cyan selection:text-background bg-grid-pattern">
      {/* Navigation */}
      <header className="border-b border-border/80 bg-sidebar/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-cyan to-accent-indigo flex items-center justify-center font-bold text-background glow-cyan-subtle">
              CS
            </div>
            <span className="font-bold text-lg tracking-tight text-text-primary flex items-center gap-2">
              ChainStream
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                v1.0.0
              </span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-text-secondary">
            <a href="#architecture" className="hover:text-text-primary transition-colors">
              Architecture
            </a>
            <a href="#features" className="hover:text-text-primary transition-colors">
              Features
            </a>
            <a href="#chains" className="hover:text-text-primary transition-colors">
              Networks
            </a>
            <a
              href="http://localhost:8080/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent-cyan flex items-center gap-1 transition-colors"
            >
              API Docs <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-accent-cyan text-background font-semibold text-sm hover:brightness-110 transition-all glow-cyan-subtle flex items-center gap-2"
            >
              Open Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-elevated border border-accent-cyan/30 text-xs font-mono text-accent-cyan">
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
            Multi-Chain Production Indexer & Streaming Engine
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-text-primary leading-[1.1]">
            Blockchain Data. <br />
            <span className="bg-gradient-to-r from-accent-cyan via-cyan-200 to-accent-indigo bg-clip-text text-transparent">
              Indexed in Real Time.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto font-normal leading-relaxed">
            High-performance, fault-tolerant indexing platform ingesting on-chain events across
            Ethereum Sepolia, Base Sepolia, and Polygon Amoy through distributed Kafka streaming,
            PostgreSQL persistence, and low-latency Go APIs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-accent-cyan text-background font-bold text-sm hover:brightness-110 transition-all glow-cyan flex items-center justify-center gap-2"
            >
              Enter Control Center <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="http://localhost:8080/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-card border border-border text-text-primary font-semibold text-sm hover:border-accent-cyan/60 hover:bg-elevated transition-all flex items-center justify-center gap-2"
            >
              <Terminal className="w-4 h-4 text-accent-cyan" /> Explore API Docs
            </a>
          </div>

          {/* Real-time Telemetry Stats Pill */}
          <div className="pt-10 max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border/80 text-left">
              <span className="text-xs text-text-secondary uppercase tracking-wider block font-medium">
                Active Networks
              </span>
              <span className="text-2xl font-bold font-mono text-accent-cyan">3 Chains</span>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/80 text-left">
              <span className="text-xs text-text-secondary uppercase tracking-wider block font-medium">
                Indexing Pipeline
              </span>
              <span className="text-2xl font-bold font-mono text-status-healthy">0 Block Lag</span>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/80 text-left">
              <span className="text-xs text-text-secondary uppercase tracking-wider block font-medium">
                Reorg Recovery
              </span>
              <span className="text-2xl font-bold font-mono text-accent-indigo">Automated</span>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/80 text-left">
              <span className="text-xs text-text-secondary uppercase tracking-wider block font-medium">
                API Latency
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-400">&lt; 15 ms</span>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Visualization Section */}
      <section id="architecture" className="py-20 px-6 border-t border-border/80 bg-sidebar/40">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold tracking-widest text-accent-cyan uppercase">
              Distributed Infrastructure
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
              End-to-End Streaming Architecture
            </h2>
            <p className="text-text-secondary text-sm max-w-2xl mx-auto">
              Fault-tolerant event ingestion decoupling RPC polling from API consumer reads using
              Apache Kafka, Redis, and PostgreSQL.
            </p>
          </div>

          {/* Diagram Flow */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            {/* Step 1: RPC Providers */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3 relative group hover:border-accent-cyan/60 transition-all">
              <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center text-accent-cyan border border-border">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-text-primary">RPC Providers</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Ethereum Sepolia, Base Sepolia, & Polygon Amoy endpoints with failover & circuit breaking.
              </p>
              <div className="text-[10px] font-mono text-accent-cyan">HTTP & WebSocket</div>
            </div>

            {/* Step 2: Rust Indexer */}
            <div className="bg-card border border-accent-cyan/50 rounded-xl p-5 space-y-3 relative group glow-cyan-subtle">
              <div className="w-10 h-10 rounded-lg bg-accent-cyan/15 flex items-center justify-center text-accent-cyan border border-accent-cyan/40">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-text-primary">Rust Ingestion Engine</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Async Tokio workers, block backfill, log decoding, and canonical reorg reconciliation.
              </p>
              <div className="text-[10px] font-mono text-accent-cyan">Tokio / Alloy ABI</div>
            </div>

            {/* Step 3: Kafka */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3 relative group hover:border-accent-cyan/60 transition-all">
              <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center text-accent-indigo border border-border">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-text-primary">Apache Kafka</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Partitioned event streams (`chainstream.blocks`, `transactions`, `events`, `reorgs`).
              </p>
              <div className="text-[10px] font-mono text-accent-indigo">Partition Ordered</div>
            </div>

            {/* Step 4: Storage */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3 relative group hover:border-accent-cyan/60 transition-all">
              <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center text-status-healthy border border-border">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-text-primary">PostgreSQL & Redis</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Idempotent indexed storage, composite indexes, fencing checkpoints, and Redis pub/sub.
              </p>
              <div className="text-[10px] font-mono text-status-healthy">Postgres 16 / Redis 7</div>
            </div>

            {/* Step 5: Go API */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3 relative group hover:border-accent-cyan/60 transition-all">
              <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center text-cyan-400 border border-border">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-text-primary">Go API Gateway</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Cursor-paginated REST endpoints, API key authentication, rate limits, and WebSocket feeds.
              </p>
              <div className="text-[10px] font-mono text-cyan-400">REST & WebSocket</div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Chains Table Section */}
      <section id="chains" className="py-20 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-accent-cyan uppercase">
                Active Networks
              </span>
              <h2 className="text-3xl font-bold text-text-primary mt-1">Multi-Chain Ingestion</h2>
            </div>
            <Link
              href="/dashboard/chains"
              className="text-sm font-semibold text-accent-cyan hover:underline flex items-center gap-1"
            >
              View detailed chain telemetry <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-elevated/60 text-xs font-mono uppercase text-text-secondary border-b border-border">
                  <tr>
                    <th className="py-3.5 px-6">Network</th>
                    <th className="py-3.5 px-6">Chain ID</th>
                    <th className="py-3.5 px-6">Type</th>
                    <th className="py-3.5 px-6">Confirmation Depth</th>
                    <th className="py-3.5 px-6">RPC Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr className="hover:bg-elevated/40 transition-colors">
                    <td className="py-4 px-6 font-semibold flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-cyan-400" />
                      Ethereum Sepolia
                    </td>
                    <td className="py-4 px-6 font-mono text-accent-cyan">11155111</td>
                    <td className="py-4 px-6 font-mono text-xs text-text-secondary">EVM Testnet</td>
                    <td className="py-4 px-6 font-mono">12 blocks</td>
                    <td className="py-4 px-6">
                      <StatusBadge status="healthy" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href="/dashboard/chains/11155111"
                        className="text-xs text-accent-cyan hover:underline font-mono"
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                  <tr className="hover:bg-elevated/40 transition-colors">
                    <td className="py-4 px-6 font-semibold flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      Base Sepolia
                    </td>
                    <td className="py-4 px-6 font-mono text-accent-cyan">84532</td>
                    <td className="py-4 px-6 font-mono text-xs text-text-secondary">OP Stack L2</td>
                    <td className="py-4 px-6 font-mono">10 blocks</td>
                    <td className="py-4 px-6">
                      <StatusBadge status="healthy" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href="/dashboard/chains/84532"
                        className="text-xs text-accent-cyan hover:underline font-mono"
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                  <tr className="hover:bg-elevated/40 transition-colors">
                    <td className="py-4 px-6 font-semibold flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      Polygon Amoy
                    </td>
                    <td className="py-4 px-6 font-mono text-accent-cyan">80002</td>
                    <td className="py-4 px-6 font-mono text-xs text-text-secondary">Polygon PoS</td>
                    <td className="py-4 px-6 font-mono">16 blocks</td>
                    <td className="py-4 px-6">
                      <StatusBadge status="healthy" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href="/dashboard/chains/80002"
                        className="text-xs text-accent-cyan hover:underline font-mono"
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Code Demo Snippet Section */}
      <section className="py-20 px-6 border-t border-border bg-sidebar/30">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="text-xs font-mono font-bold tracking-widest text-accent-cyan uppercase">
              Developer-First API
            </span>
            <h2 className="text-3xl font-bold text-text-primary">
              Unified Schema. Decoded Events.
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              Query normalized smart contract events across any EVM chain. Receive pre-decoded parameters,
              canonical verification status, and block headers without manual ABI hex parsing.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Link
                href="/dashboard/events"
                className="px-4 py-2 rounded-lg bg-elevated border border-border text-sm font-semibold text-accent-cyan hover:border-accent-cyan transition-all"
              >
                Open Event Explorer
              </Link>
              <Link
                href="/dashboard/api-keys"
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary"
              >
                API Playground →
              </Link>
            </div>
          </div>

          {/* Interactive Code Box */}
          <div className="bg-[#090D16] border border-border rounded-xl overflow-hidden font-mono text-xs shadow-2xl">
            <div className="bg-elevated px-4 py-2.5 border-b border-border flex items-center justify-between text-text-secondary">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-[11px] text-text-secondary">GET /api/v1/chains/11155111/events</span>
              </div>
              <span className="text-[10px] text-accent-cyan">200 OK (8ms)</span>
            </div>
            <pre className="p-4 text-slate-300 overflow-x-auto leading-relaxed">
              <code>{`{
  "data": [
    {
      "chain_id": 11155111,
      "block_number": 5821040,
      "event_name": "Transfer",
      "event_signature": "Transfer(address,address,uint256)",
      "contract_address": "0x6b175474e89094c44da98b954eedeac495271d0f",
      "decoded_params": {
        "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        "to": "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce",
        "value": "100000000000000000000"
      },
      "is_canonical": true
    }
  ],
  "pagination": { "has_more": true, "limit": 1 }
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 bg-sidebar">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-accent-cyan to-accent-indigo flex items-center justify-center font-bold text-background text-xs">
              CS
            </div>
            <span className="font-semibold text-text-primary">ChainStream</span>
            <span>— Enterprise Multi-Chain Blockchain Indexer</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-text-primary transition-colors">
              Dashboard
            </Link>
            <a href="http://localhost:8080/docs" className="hover:text-text-primary transition-colors">
              OpenAPI
            </a>
            <Link href="/dashboard/api-keys" className="hover:text-text-primary transition-colors">
              API Keys
            </Link>
            <Link href="/dashboard/infrastructure" className="hover:text-text-primary transition-colors">
              Observability
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
