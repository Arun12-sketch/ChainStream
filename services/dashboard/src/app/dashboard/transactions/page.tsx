"use client";

import React, { useEffect, useState } from "react";
import { ArrowRightLeft, Search, Copy, Check, X, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ChainBadge } from "@/components/ChainBadge";
import { api } from "@/lib/api";
import { Transaction, Chain } from "@/lib/types";
import { formatNumber, formatTimestamp, truncateHash } from "@/lib/utils";

export default function TransactionsPage() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [selectedChain, setSelectedChain] = useState<number>(11155111);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTxs = async () => {
    try {
      setLoading(true);
      const c = await api.getChains();
      setChains(c);
      const res = await api.getTransactions(selectedChain, undefined, 30);
      setTxs(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTxs();
  }, [selectedChain]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredTxs = txs.filter((tx) => {
    if (!search) return true;
    return (
      tx.tx_hash.toLowerCase().includes(search.toLowerCase()) ||
      tx.from_address.toLowerCase().includes(search.toLowerCase()) ||
      (tx.to_address && tx.to_address.toLowerCase().includes(search.toLowerCase())) ||
      tx.block_number.toString().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Transaction Explorer
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Query indexed transactions, sender and recipient addresses, input calldata, and gas fee states.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

          <div className="relative">
            <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by tx hash / address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 bg-card border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent-cyan font-mono"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-elevated/60 text-xs font-mono uppercase text-text-secondary border-b border-border">
              <tr>
                <th className="py-3.5 px-6">Tx Hash</th>
                <th className="py-3.5 px-6">Block</th>
                <th className="py-3.5 px-6">From</th>
                <th className="py-3.5 px-6">To</th>
                <th className="py-3.5 px-6">Value (ETH)</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTxs.map((tx) => (
                <tr
                  key={tx.tx_hash}
                  onClick={() => setSelectedTx(tx)}
                  className="hover:bg-elevated/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-6 font-mono text-xs text-accent-cyan font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span>{truncateHash(tx.tx_hash, 8, 6)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(tx.tx_hash);
                        }}
                        className="text-text-secondary hover:text-accent-cyan p-0.5"
                      >
                        {copiedHash === tx.tx_hash ? (
                          <Check className="w-3 h-3 text-status-healthy" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-6 font-mono text-xs text-text-primary">
                    #{formatNumber(tx.block_number)}
                  </td>
                  <td className="py-3.5 px-6 font-mono text-xs text-text-secondary">
                    {truncateHash(tx.from_address, 6, 4)}
                  </td>
                  <td className="py-3.5 px-6 font-mono text-xs text-text-secondary">
                    {tx.to_address ? truncateHash(tx.to_address, 6, 4) : "Contract Deploy"}
                  </td>
                  <td className="py-3.5 px-6 font-mono text-xs">
                    {(Number(tx.value) / 1e18).toFixed(4)}
                  </td>
                  <td className="py-3.5 px-6">
                    <StatusBadge status={tx.status === 1 ? "canonical" : "orphaned"} />
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono text-xs text-text-secondary">
                    {formatTimestamp(tx.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Drawer */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-accent-cyan" />
                <h3 className="font-bold text-lg text-text-primary font-mono">
                  Transaction Details
                </h3>
                <StatusBadge status={selectedTx.status === 1 ? "confirmed" : "failed"} />
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-elevated"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-elevated border border-border space-y-1">
                <span className="text-text-secondary uppercase text-[10px]">Transaction Hash</span>
                <div className="text-accent-cyan break-all select-all">{selectedTx.tx_hash}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-elevated border border-border space-y-1">
                  <span className="text-text-secondary uppercase text-[10px] block">From (Sender)</span>
                  <span className="text-text-primary break-all select-all">{selectedTx.from_address}</span>
                </div>
                <div className="p-3 rounded-lg bg-elevated border border-border space-y-1">
                  <span className="text-text-secondary uppercase text-[10px] block">To (Recipient)</span>
                  <span className="text-text-primary break-all select-all">{selectedTx.to_address || "Contract Creation"}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-elevated border border-border">
                  <span className="text-text-secondary uppercase text-[10px] block">Block</span>
                  <span className="text-accent-cyan font-bold">#{formatNumber(selectedTx.block_number)}</span>
                </div>
                <div className="p-3 rounded-lg bg-elevated border border-border">
                  <span className="text-text-secondary uppercase text-[10px] block">Gas Used</span>
                  <span className="text-text-primary">{formatNumber(selectedTx.gas_used)}</span>
                </div>
                <div className="p-3 rounded-lg bg-elevated border border-border">
                  <span className="text-text-secondary uppercase text-[10px] block">Value (ETH)</span>
                  <span className="text-text-primary">{(Number(selectedTx.value) / 1e18).toFixed(4)}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-elevated border border-border space-y-1">
                <span className="text-text-secondary uppercase text-[10px]">Input Calldata</span>
                <div className="text-text-secondary break-all max-h-24 overflow-y-auto">{selectedTx.input_data}</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
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
