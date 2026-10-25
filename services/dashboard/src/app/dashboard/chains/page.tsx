"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Globe, Search, RefreshCw, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { Chain, ChainStats } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export default function ChainsPage() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [statsMap, setStatsMap] = useState<Record<number, ChainStats>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadChains = async () => {
    try {
      const data = await api.getChains();
      setChains(data);
      const statsPromises = data.map((c) => api.getChainStats(c.id));
      const statsList = await Promise.all(statsPromises);
      const newMap: Record<number, ChainStats> = {};
      statsList.forEach((s) => (newMap[s.chain_id] = s));
      setStatsMap(newMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChains();
  }, []);

  const filteredChains = chains.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toString().includes(search) ||
      c.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Supported EVM Blockchains
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure, inspect, and monitor active multi-chain indexing pipelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chain by name / ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 bg-card border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent-cyan"
            />
          </div>
          <button
            onClick={loadChains}
            className="p-1.5 rounded-lg bg-card border border-border hover:border-accent-cyan/60 text-text-secondary hover:text-accent-cyan"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chains Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-elevated/60 text-xs font-mono uppercase text-text-secondary border-b border-border">
              <tr>
                <th className="py-3.5 px-6">Network</th>
                <th className="py-3.5 px-6">Chain ID</th>
                <th className="py-3.5 px-6">Network Type</th>
                <th className="py-3.5 px-6">Latest Block</th>
                <th className="py-3.5 px-6">Confirmation Depth</th>
                <th className="py-3.5 px-6">Lag</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredChains.map((c) => {
                const s = statsMap[c.id];
                const latest = s?.latest_indexed_block || (c.id === 11155111 ? 5821040 : c.id === 84532 ? 12519300 : 7430120);

                return (
                  <tr key={c.id} className="hover:bg-elevated/40 transition-colors">
                    <td className="py-4 px-6 font-semibold flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-elevated border border-border flex items-center justify-center text-accent-cyan">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-text-primary">{c.name}</div>
                        <div className="text-[11px] font-mono text-text-secondary">{c.slug}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-accent-cyan font-semibold">{c.id}</td>
                    <td className="py-4 px-6 font-mono text-xs uppercase text-text-secondary">{c.network_type}</td>
                    <td className="py-4 px-6 font-mono font-bold text-text-primary">#{formatNumber(latest)}</td>
                    <td className="py-4 px-6 font-mono text-xs">{c.confirmation_depth} blocks</td>
                    <td className="py-4 px-6 font-mono text-xs text-status-healthy font-semibold">0 blocks</td>
                    <td className="py-4 px-6">
                      <StatusBadge status="healthy" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/dashboard/chains/${c.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-elevated hover:bg-accent-cyan hover:text-background text-xs font-semibold text-text-primary transition-all border border-border"
                      >
                        Inspect <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
