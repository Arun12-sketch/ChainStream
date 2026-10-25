"use client";

import React, { useEffect, useState } from "react";
import { Box, Search, Copy, Check, Filter, RefreshCw, X, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ChainBadge } from "@/components/ChainBadge";
import { api } from "@/lib/api";
import { Block, Chain } from "@/lib/types";
import { formatNumber, formatTimestamp, truncateHash } from "@/lib/utils";

export default function BlocksPage() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [selectedChain, setSelectedChain] = useState<number>(11155111);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [search, setSearch] = useState("");
  const [canonicalFilter, setCanonicalFilter] = useState<string>("all");
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBlocks = async () => {
    try {
      setLoading(true);
      const c = await api.getChains();
      setChains(c);
      const res = await api.getBlocks(selectedChain, undefined, 30, canonicalFilter === "canonical");
      setBlocks(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlocks();
  }, [selectedChain, canonicalFilter]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredBlocks = blocks.filter((b) => {
    if (!search) return true;
    return (
      b.block_number.toString().includes(search) ||
      b.block_hash.toLowerCase().includes(search.toLowerCase()) ||
      b.parent_hash.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Block Explorer</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Inspect canonical and orphaned block headers, parent hashes, and gas usage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Chain Filter */}
          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(Number(e.target.value))}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-cyan font-mono"
          >
            {chains.map((c) => (
              <option key={c.id} value={c.id} className="bg-sidebar">
                {c.name}
              </option>
            ))}
          </select>

          {/* Canonical Filter */}
          <select
            value={canonicalFilter}
            onChange={(e) => setCanonicalFilter(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-cyan font-mono"
          >
            <option value="all">All Blocks</option>
            <option value="canonical">Canonical Only</option>
            <option value="orphaned">Orphaned Only</option>
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by block / hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 bg-card border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent-cyan font-mono"
            />
          </div>

          <button
            onClick={loadBlocks}
            className="p-1.5 rounded-lg bg-card border border-border hover:border-accent-cyan/60 text-text-secondary hover:text-accent-cyan"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Blocks Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-elevated/60 text-xs font-mono uppercase text-text-secondary border-b border-border">
              <tr>
                <th className="py-3.5 px-6">Block Number</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Block Hash</th>
                <th className="py-3.5 px-6">Parent Hash</th>
                <th className="py-3.5 px-6">Transactions</th>
                <th className="py-3.5 px-6">Gas Used</th>
                <th className="py-3.5 px-6 text-right">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredBlocks.map((b) => (
                <tr
                  key={b.block_hash}
                  onClick={() => setSelectedBlock(b)}
                  className="hover:bg-elevated/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-6 font-mono font-bold text-accent-cyan">
                    #{formatNumber(b.block_number)}
                  </td>
                  <td className="py-3.5 px-6">
                    <StatusBadge status={b.is_canonical ? "canonical" : "orphaned"} />
                  </td>
                  <td className="py-3.5 px-6 font-mono text-xs text-text-primary">
                    <div className="flex items-center gap-1.5">
                      <span>{truncateHash(b.block_hash, 8, 6)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(b.block_hash);
                        }}
                        className="text-text-secondary hover:text-accent-cyan p-0.5"
                      >
                        {copiedHash === b.block_hash ? (
                          <Check className="w-3 h-3 text-status-healthy" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-6 font-mono text-xs text-text-secondary">
                    {truncateHash(b.parent_hash, 8, 6)}
                  </td>
                  <td className="py-3.5 px-6 font-mono text-xs">{b.tx_count} txs</td>
                  <td className="py-3.5 px-6 font-mono text-xs text-text-secondary">
                    {formatNumber(b.gas_used)}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono text-xs text-text-secondary">
                    {formatTimestamp(b.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block Detail Modal Drawer */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-accent-cyan" />
                <h3 className="font-bold text-lg text-text-primary font-mono">
                  Block #{formatNumber(selectedBlock.block_number)}
                </h3>
                <StatusBadge status={selectedBlock.is_canonical ? "canonical" : "orphaned"} />
              </div>
              <button
                onClick={() => setSelectedBlock(null)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-elevated"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-elevated border border-border space-y-1">
                <span className="text-text-secondary uppercase text-[10px]">Block Hash</span>
                <div className="text-accent-cyan break-all select-all">{selectedBlock.block_hash}</div>
              </div>

              <div className="p-3 rounded-lg bg-elevated border border-border space-y-1">
                <span className="text-text-secondary uppercase text-[10px]">Parent Hash</span>
                <div className="text-text-primary break-all select-all">{selectedBlock.parent_hash}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-elevated border border-border">
                  <span className="text-text-secondary uppercase text-[10px] block">Transactions</span>
                  <span className="text-sm font-bold text-text-primary">{selectedBlock.tx_count} txs</span>
                </div>
                <div className="p-3 rounded-lg bg-elevated border border-border">
                  <span className="text-text-secondary uppercase text-[10px] block">Timestamp</span>
                  <span className="text-text-primary">{formatTimestamp(selectedBlock.timestamp)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-elevated border border-border">
                  <span className="text-text-secondary uppercase text-[10px] block">Gas Used</span>
                  <span className="text-text-primary">{formatNumber(selectedBlock.gas_used)}</span>
                </div>
                <div className="p-3 rounded-lg bg-elevated border border-border">
                  <span className="text-text-secondary uppercase text-[10px] block">Gas Limit</span>
                  <span className="text-text-primary">{formatNumber(selectedBlock.gas_limit)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedBlock(null)}
                className="px-4 py-2 rounded-lg bg-elevated text-xs font-semibold text-text-primary hover:bg-accent-cyan hover:text-background transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
