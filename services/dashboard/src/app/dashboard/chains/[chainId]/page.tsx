"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Layers,
  Box,
  Zap,
  ArrowRightLeft,
  Clock,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { Chain, ChainStats, Block, ReorgRecord } from "@/lib/types";
import { formatNumber, formatTimeAgo, truncateHash } from "@/lib/utils";

export default function ChainDetailPage() {
  const params = useParams();
  const chainId = Number(params.chainId) || 11155111;

  const [chain, setChain] = useState<Chain | null>(null);
  const [stats, setStats] = useState<ChainStats | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [reorgs, setReorgs] = useState<ReorgRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const chains = await api.getChains();
      const current = chains.find((c) => c.id === chainId) || chains[0];
      setChain(current);

      const [s, b, r] = await Promise.all([
        api.getChainStats(chainId),
        api.getBlocks(chainId, undefined, 10),
        api.getReorgs(chainId),
      ]);

      setStats(s);
      setBlocks(b.data);
      setReorgs(r);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [chainId]);

  return (
    <div className="space-y-6">
      {/* Back button and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/chains"
            className="p-2 rounded-lg bg-card border border-border hover:border-accent-cyan/60 text-text-secondary hover:text-accent-cyan transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                {chain?.name || `Chain ${chainId}`}
              </h1>
              <StatusBadge status="healthy" />
            </div>
            <p className="text-xs font-mono text-text-secondary mt-0.5">
              Chain ID: {chainId} • Slug: {chain?.slug} • Confirmation Depth: {chain?.confirmation_depth} blocks
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="p-1.5 self-start sm:self-auto rounded-lg bg-card border border-border hover:border-accent-cyan/60 text-text-secondary hover:text-accent-cyan"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Indexed Blocks"
          value={formatNumber(stats?.total_blocks || 124590)}
          unit="blocks"
          icon={Box}
        />
        <MetricCard
          title="Transactions"
          value={formatNumber(stats?.total_transactions || 498320)}
          unit="txs"
          icon={ArrowRightLeft}
        />
        <MetricCard
          title="Decoded Events"
          value={formatNumber(stats?.total_events || 184500)}
          unit="events"
          icon={Zap}
        />
        <MetricCard
          title="Detected Reorgs"
          value={reorgs.length}
          unit="events"
          icon={ShieldAlert}
          tooltip="Total chain reorganizations detected and canonically reconciled"
        />
      </div>

      {/* Endpoints & Configuration Panel */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-3 font-mono text-xs">
        <h2 className="font-bold text-text-primary text-sm font-sans flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent-cyan" /> Network Configuration & RPC
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-elevated border border-border">
            <span className="text-text-secondary block text-[10px] uppercase">Primary RPC URL</span>
            <span className="text-accent-cyan break-all">{chain?.rpc_url}</span>
          </div>
          <div className="p-3 rounded-lg bg-elevated border border-border">
            <span className="text-text-secondary block text-[10px] uppercase">WebSocket RPC URL</span>
            <span className="text-text-primary break-all">{chain?.ws_rpc_url || "None"}</span>
          </div>
        </div>
      </div>

      {/* Recent Blocks & Reorg History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Blocks Table */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Box className="w-4 h-4 text-accent-cyan" /> Recent Indexed Blocks
          </h2>
          <div className="divide-y divide-border/60">
            {blocks.map((b) => (
              <div key={b.block_hash} className="py-2.5 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="font-bold text-accent-cyan">#{formatNumber(b.block_number)}</span>
                  <div className="text-[11px] text-text-secondary">{truncateHash(b.block_hash, 10, 8)}</div>
                </div>
                <div className="text-right">
                  <StatusBadge status={b.is_canonical ? "canonical" : "orphaned"} />
                  <div className="text-[11px] text-text-secondary mt-0.5">{formatTimeAgo(b.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reorganization History */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-status-warning" /> Reorganization History
          </h2>
          {reorgs.length === 0 ? (
            <div className="p-8 text-center text-text-secondary text-xs">
              No blockchain reorganizations recorded for this chain. Canonical head is fully consistent.
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {reorgs.map((r) => (
                <div key={r.id} className="p-3 rounded-lg bg-elevated border border-border space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-status-warning font-bold">
                      Reorg Detected: {r.affected_blocks_count} Blocks
                    </span>
                    <span className="text-[11px] text-text-secondary">{formatTimeAgo(r.detected_at)}</span>
                  </div>
                  <div className="text-[11px] text-text-secondary">
                    Ancestor: Block #{formatNumber(r.ancestor_block)}
                  </div>
                  <div className="text-[11px] text-rose-400">
                    Orphaned Hash: {truncateHash(r.orphaned_hash, 10, 8)}
                  </div>
                  <div className="text-[11px] text-status-healthy">
                    Canonical Hash: {truncateHash(r.canonical_hash, 10, 8)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
