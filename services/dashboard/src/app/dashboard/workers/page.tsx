"use client";

import React, { useEffect, useState } from "react";
import { Cpu, RefreshCw, ShieldCheck, HeartPulse, HardDrive, Terminal } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ChainBadge } from "@/components/ChainBadge";
import { api } from "@/lib/api";
import { WorkerStatus } from "@/lib/types";
import { formatNumber, formatTimeAgo } from "@/lib/utils";

export default function WorkersPage() {
  const [workers, setWorkers] = useState<WorkerStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const data = await api.getWorkers();
      setWorkers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
    const interval = setInterval(loadWorkers, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Distributed Indexer Workers
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Distributed worker leases, fencing token coordination, heartbeat monitoring, and processing throughput.
          </p>
        </div>

        <button
          onClick={loadWorkers}
          className="p-1.5 self-start sm:self-auto rounded-lg bg-card border border-border hover:border-accent-cyan/60 text-text-secondary hover:text-accent-cyan"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {workers.map((w) => (
          <div
            key={w.chain_id}
            className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xl hover:border-accent-cyan/50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-elevated border border-border flex items-center justify-center text-accent-cyan">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary">{w.chain_name}</h3>
                  <span className="text-[11px] font-mono text-text-secondary">{w.worker_id}</span>
                </div>
              </div>
              <StatusBadge status={w.is_healthy ? "healthy" : "lagging"} />
            </div>

            <div className="space-y-2 text-xs font-mono pt-2 border-t border-border/60">
              <div className="flex justify-between">
                <span className="text-text-secondary">Fencing Token:</span>
                <span className="text-accent-cyan font-bold">#{w.fencing_token}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Current Block:</span>
                <span className="text-text-primary font-bold">#{formatNumber(w.current_block)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Committed Checkpoint:</span>
                <span className="text-text-primary font-bold">#{formatNumber(w.last_checkpoint)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Throughput:</span>
                <span className="text-status-healthy font-semibold">{w.throughput_bps} blocks/sec</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">RPC Retries:</span>
                <span className="text-text-primary">{w.retry_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Last Heartbeat:</span>
                <span className="text-text-secondary">{formatTimeAgo(w.heartbeat_at)}</span>
              </div>
            </div>

            {/* Fencing Token Lease Status Banner */}
            <div className="p-2.5 rounded-lg bg-elevated border border-border/80 text-[11px] font-mono flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-text-secondary">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Lease Active</span>
              </div>
              <span className="text-emerald-400 font-semibold">Postgres Distributed</span>
            </div>
          </div>
        ))}
      </div>

      {/* Distributed Worker Architecture Info */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-3 font-mono text-xs">
        <h2 className="font-bold text-text-primary text-sm font-sans flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent-cyan" /> Worker Coordination Protocol
        </h2>
        <p className="text-text-secondary leading-relaxed font-sans text-xs">
          ChainStream uses PostgreSQL lease-based distributed locking with strictly monotonically
          increasing <b>fencing tokens</b> to guarantee single-writer checkpoint consistency. If an
          indexer worker experiences a network partition or stop-the-world pause, any checkpoint commit
          attempt with a stale fencing token is atomically rejected by PostgreSQL, preventing
          split-brain race conditions.
        </p>
      </div>
    </div>
  );
}
