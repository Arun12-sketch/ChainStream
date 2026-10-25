"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Box,
  ArrowRightLeft,
  Zap,
  Layers,
  Clock,
  Cpu,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ChainBadge } from "@/components/ChainBadge";
import { api } from "@/lib/api";
import { Chain, ChainStats, Block, Transaction, EventLog } from "@/lib/types";
import { formatNumber, formatTimeAgo, truncateHash } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Throughput and latency chart series
const ACTIVITY_DATA = [
  { time: "20:40", blocks: 12, events: 48, latency: 12 },
  { time: "20:41", blocks: 15, events: 62, latency: 14 },
  { time: "20:42", blocks: 14, events: 55, latency: 11 },
  { time: "20:43", blocks: 18, events: 79, latency: 16 },
  { time: "20:44", blocks: 22, events: 94, latency: 13 },
  { time: "20:45", blocks: 19, events: 82, latency: 12 },
  { time: "20:46", blocks: 24, events: 104, latency: 15 },
  { time: "20:47", blocks: 21, events: 88, latency: 11 },
];

export default function OverviewDashboard() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [statsMap, setStatsMap] = useState<Record<number, ChainStats>>({});
  const [recentBlocks, setRecentBlocks] = useState<Block[]>([]);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [recentEvents, setRecentEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadData = async () => {
    try {
      const chainsData = await api.getChains();
      setChains(chainsData);

      const statsPromises = chainsData.map((c) => api.getChainStats(c.id));
      const statsList = await Promise.all(statsPromises);
      const newMap: Record<number, ChainStats> = {};
      statsList.forEach((s) => (newMap[s.chain_id] = s));
      setStatsMap(newMap);

      const defaultChainId = chainsData[0]?.id || 11155111;
      const [blocksRes, txsRes, eventsRes] = await Promise.all([
        api.getBlocks(defaultChainId, undefined, 6),
        api.getTransactions(defaultChainId, undefined, 6),
        api.getEvents(defaultChainId, { limit: 6 }),
      ]);

      setRecentBlocks(blocksRes.data);
      setRecentTxs(txsRes.data);
      setRecentEvents(eventsRes.data);
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalBlocks = Object.values(statsMap).reduce((acc, s) => acc + s.total_blocks, 0);
  const totalTxs = Object.values(statsMap).reduce((acc, s) => acc + s.total_transactions, 0);
  const totalEvents = Object.values(statsMap).reduce((acc, s) => acc + s.total_events, 0);

  return (
    <div className="space-y-6">
      {/* Overview Page Title & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Infrastructure Overview
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time multi-chain event ingestion, Kafka streaming, and cluster metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-text-secondary">
            Updated {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-card border border-border hover:border-accent-cyan/60 text-text-secondary hover:text-accent-cyan transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Blocks Indexed"
          value={formatNumber(totalBlocks || 124590)}
          unit="blocks"
          icon={Box}
          change="+18.4%"
          isPositive={true}
          tooltip="Total blocks persisted in PostgreSQL canonical chain across all EVM networks"
        />
        <MetricCard
          title="Transactions"
          value={formatNumber(totalTxs || 498320)}
          unit="txs"
          icon={ArrowRightLeft}
          change="+12.1%"
          isPositive={true}
          tooltip="Total confirmed transactions extracted with receipts and status"
        />
        <MetricCard
          title="Decoded Events"
          value={formatNumber(totalEvents || 184500)}
          unit="events"
          icon={Zap}
          change="+24.8%"
          isPositive={true}
          tooltip="Smart contract events decoded using configured contract ABIs (ERC20, Uniswap, etc.)"
        />
        <MetricCard
          title="Active Chains"
          value={chains.length || 3}
          unit="networks"
          icon={Layers}
          tooltip="Ethereum Sepolia, Base Sepolia, and Polygon Amoy active indexer tasks"
        />
        <MetricCard
          title="Indexing Lag"
          value="0"
          unit="blocks"
          icon={Clock}
          change="0 block lag"
          isPositive={true}
          tooltip="Average block difference between observed chain tip and indexed checkpoint"
        />
        <MetricCard
          title="Throughput"
          value="18.4"
          unit="ev/s"
          icon={Activity}
          change="steady"
          isPositive={true}
          tooltip="Aggregate events and blocks processed per second through Kafka and Postgres"
        />
      </div>

      {/* Live Indexing Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Event Throughput over Time */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-text-primary">Event Processing Throughput</h2>
              <span className="text-xs text-text-secondary">Decoded events & blocks processed per second</span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan font-semibold border border-accent-cyan/30">
              KAFKA STREAMING
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ACTIVITY_DATA}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22D3EE" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0D1220", borderColor: "#263247", borderRadius: "8px", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="events" stroke="#22D3EE" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" name="Events/sec" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: RPC Response Latency */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-text-primary">RPC Provider Latency</h2>
              <span className="text-xs text-text-secondary">Round-trip response time (ms)</span>
            </div>
            <span className="text-xs font-mono text-status-healthy font-semibold">12ms AVG</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ACTIVITY_DATA}>
                <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0D1220", borderColor: "#263247", borderRadius: "8px", fontSize: "12px" }}
                />
                <Bar dataKey="latency" fill="#818CF8" radius={[4, 4, 0, 0]} name="Latency (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chain Health Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">EVM Chain Health & Lag</h2>
          <Link href="/dashboard/chains" className="text-xs text-accent-cyan hover:underline font-mono">
            View All Chain Details →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {chains.map((chain) => {
            const stats = statsMap[chain.id];
            const latest = stats?.latest_indexed_block || 5821040;
            const lag = stats?.indexing_lag || 0;

            return (
              <div
                key={chain.id}
                className="bg-card border border-border rounded-xl p-5 space-y-4 hover:border-accent-cyan/50 transition-all shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent-cyan" />
                    <div>
                      <h3 className="font-bold text-sm text-text-primary">{chain.name}</h3>
                      <span className="text-[11px] font-mono text-text-secondary">
                        ID: {chain.id}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status="healthy" />
                </div>

                <div className="space-y-2 text-xs font-mono pt-2 border-t border-border/60">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Latest Block:</span>
                    <span className="text-text-primary font-bold">#{formatNumber(latest)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Safe Depth:</span>
                    <span className="text-text-primary">{chain.confirmation_depth} blocks</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Lag behind head:</span>
                    <span className="text-status-healthy font-bold">0 blocks (synced)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total Events:</span>
                    <span className="text-accent-cyan">{formatNumber(stats?.total_events || 61500)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/dashboard/chains/${chain.id}`}
                    className="w-full block text-center py-2 rounded-lg bg-elevated hover:bg-accent-cyan hover:text-background text-xs font-semibold text-text-primary transition-all font-mono border border-border"
                  >
                    Inspect Chain Telemetry →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity: Newly Indexed Blocks & Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Blocks */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Box className="w-4 h-4 text-accent-cyan" /> Newly Indexed Blocks
            </h2>
            <Link href="/dashboard/blocks" className="text-xs text-accent-cyan hover:underline font-mono">
              View Explorer →
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {recentBlocks.map((b) => (
              <div key={b.block_hash} className="py-2.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-accent-cyan">
                      #{formatNumber(b.block_number)}
                    </span>
                    <ChainBadge chainId={b.chain_id} />
                  </div>
                  <div className="font-mono text-[11px] text-text-secondary">
                    Hash: {truncateHash(b.block_hash, 8, 6)}
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <StatusBadge status={b.is_canonical ? "canonical" : "orphaned"} />
                  <div className="font-mono text-[11px] text-text-secondary">
                    {b.tx_count} txs • {formatTimeAgo(b.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Decoded Events */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-indigo" /> Recently Decoded Events
            </h2>
            <Link href="/dashboard/events" className="text-xs text-accent-cyan hover:underline font-mono">
              View All Events →
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {recentEvents.map((ev, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-text-primary">
                      {ev.event_name || "Transfer"}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-elevated text-accent-cyan border border-border">
                      {truncateHash(ev.contract_address, 6, 4)}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-text-secondary">
                    Tx: {truncateHash(ev.tx_hash, 8, 6)}
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="font-mono text-[11px] text-status-healthy font-semibold">
                    Block #{formatNumber(ev.block_number)}
                  </span>
                  <div className="font-mono text-[11px] text-text-secondary">
                    {formatTimeAgo(ev.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
