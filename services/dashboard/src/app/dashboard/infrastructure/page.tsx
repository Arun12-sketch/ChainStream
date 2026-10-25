"use client";

import React, { useEffect, useState } from "react";
import { Server, Database, Radio, Cpu, Globe, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";

export default function InfrastructurePage() {
  const [infra, setInfra] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadInfra = async () => {
    try {
      setLoading(true);
      const data = await api.getInfrastructure();
      setInfra(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInfra();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Infrastructure & Observability
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Health telemetry for Rust Indexers, Kafka partition brokers, PostgreSQL connection pools, Redis, and Go API Gateway.
          </p>
        </div>

        <button
          onClick={loadInfra}
          className="p-1.5 self-start sm:self-auto rounded-lg bg-card border border-border hover:border-accent-cyan/60 text-text-secondary hover:text-accent-cyan"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Infrastructure Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Component 1: Rust Core Indexer */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-text-primary">Rust Ingestion Engine</h3>
                <span className="text-[11px] font-mono text-text-secondary">Tokio Async Service</span>
              </div>
            </div>
            <StatusBadge status="healthy" />
          </div>

          <div className="space-y-2 text-xs font-mono pt-2 border-t border-border/60">
            <div className="flex justify-between">
              <span className="text-text-secondary">Active Chain Tasks:</span>
              <span className="text-accent-cyan font-bold">3 Tasks</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Metrics Port:</span>
              <span className="text-text-primary">9090 (Prometheus)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Circuit Breaker:</span>
              <span className="text-emerald-400 font-semibold">CLOSED (All Clear)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Memory Concurrency:</span>
              <span className="text-text-primary">Bounded (5 blocks/batch)</span>
            </div>
          </div>
        </div>

        {/* Component 2: Apache Kafka */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent-indigo/15 border border-accent-indigo/30 flex items-center justify-center text-accent-indigo">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-text-primary">Apache Kafka Broker</h3>
                <span className="text-[11px] font-mono text-text-secondary">Event Stream Backbone</span>
              </div>
            </div>
            <StatusBadge status="healthy" />
          </div>

          <div className="space-y-2 text-xs font-mono pt-2 border-t border-border/60">
            <div className="flex justify-between">
              <span className="text-text-secondary">Broker Address:</span>
              <span className="text-text-primary">localhost:9092</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Active Topics:</span>
              <span className="text-accent-indigo font-bold">4 Topics</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Consumer Lag:</span>
              <span className="text-emerald-400 font-semibold">0 messages</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Dead-Letter Queue:</span>
              <span className="text-text-primary">0 DLQ messages</span>
            </div>
          </div>
        </div>

        {/* Component 3: PostgreSQL Database */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-text-primary">PostgreSQL 16</h3>
                <span className="text-[11px] font-mono text-text-secondary">Persistent Storage</span>
              </div>
            </div>
            <StatusBadge status="healthy" />
          </div>

          <div className="space-y-2 text-xs font-mono pt-2 border-t border-border/60">
            <div className="flex justify-between">
              <span className="text-text-secondary">Connection Pool:</span>
              <span className="text-emerald-400 font-bold">10 Idle / 25 Max</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Primary Replica:</span>
              <span className="text-text-primary">Read / Write Leader</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Fencing Leases:</span>
              <span className="text-text-primary">Active (3 Chains)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Migration Status:</span>
              <span className="text-emerald-400">001 & 002 Applied</span>
            </div>
          </div>
        </div>

        {/* Component 4: Redis */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-950/40 border border-rose-800/50 flex items-center justify-center text-rose-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-text-primary">Redis Cache & Pub/Sub</h3>
                <span className="text-[11px] font-mono text-text-secondary">Fanout & Rate Limiting</span>
              </div>
            </div>
            <StatusBadge status="healthy" />
          </div>

          <div className="space-y-2 text-xs font-mono pt-2 border-t border-border/60">
            <div className="flex justify-between">
              <span className="text-text-secondary">Pub/Sub Channels:</span>
              <span className="text-rose-400 font-bold">chainstream:*</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Rate Limiter:</span>
              <span className="text-emerald-400 font-semibold">Active (Per-key token bucket)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Status:</span>
              <span className="text-emerald-400">Connected</span>
            </div>
          </div>
        </div>

        {/* Component 5: Go API Gateway */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-text-primary">Go API Gateway</h3>
                <span className="text-[11px] font-mono text-text-secondary">REST & WebSocket</span>
              </div>
            </div>
            <StatusBadge status="healthy" />
          </div>

          <div className="space-y-2 text-xs font-mono pt-2 border-t border-border/60">
            <div className="flex justify-between">
              <span className="text-text-secondary">Runtime:</span>
              <span className="text-cyan-400 font-bold">Go 1.22</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Port:</span>
              <span className="text-text-primary">8080</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">OpenAPI Docs:</span>
              <span className="text-accent-cyan font-semibold">/docs (Swagger UI)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">P99 Latency:</span>
              <span className="text-emerald-400 font-semibold">&lt; 18ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
