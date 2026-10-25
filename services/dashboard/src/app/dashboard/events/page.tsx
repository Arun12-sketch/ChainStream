"use client";

import React, { useEffect, useState } from "react";
import { Zap, Search, Copy, Check, Filter, X, Code, Braces } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ChainBadge } from "@/components/ChainBadge";
import { api } from "@/lib/api";
import { EventLog, Chain } from "@/lib/types";
import { formatNumber, formatTimestamp, truncateHash } from "@/lib/utils";

export default function EventsPage() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [selectedChain, setSelectedChain] = useState<number>(11155111);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<EventLog | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"decoded" | "raw">("decoded");
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const c = await api.getChains();
      setChains(c);
      const res = await api.getEvents(selectedChain, { limit: 30 });
      setEvents(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [selectedChain]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredEvents = events.filter((e) => {
    if (!search) return true;
    return (
      (e.event_name && e.event_name.toLowerCase().includes(search.toLowerCase())) ||
      e.contract_address.toLowerCase().includes(search.toLowerCase()) ||
      e.tx_hash.toLowerCase().includes(search.toLowerCase()) ||
      e.block_number.toString().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Smart Contract Event Explorer
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time normalized event logs decoded across standard ABIs (ERC-20, Uniswap V3, etc.).
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
              placeholder="Filter by event name / contract / tx..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 bg-card border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent-cyan font-mono"
            />
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-elevated/60 text-xs font-mono uppercase text-text-secondary border-b border-border">
              <tr>
                <th className="py-3.5 px-6">Event</th>
                <th className="py-3.5 px-6">Contract</th>
                <th className="py-3.5 px-6">Block</th>
                <th className="py-3.5 px-6">Tx Hash</th>
                <th className="py-3.5 px-6">Log Index</th>
                <th className="py-3.5 px-6">Decoded Summary</th>
                <th className="py-3.5 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredEvents.map((ev, idx) => (
                <tr
                  key={idx}
                  onClick={() => setSelectedEvent(ev)}
                  className="hover:bg-elevated/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-6 font-mono text-xs font-bold text-accent-cyan">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-accent-cyan" />
                      <span>{ev.event_name || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-6 font-mono text-xs text-text-secondary">
                    {truncateHash(ev.contract_address, 6, 4)}
                  </td>
                  <td className="py-3.5 px-6 font-mono text-xs text-text-primary">
                    #{formatNumber(ev.block_number)}
                  </td>
                  <td className="py-3.5 px-6 font-mono text-xs text-text-secondary">
                    {truncateHash(ev.tx_hash, 6, 4)}
                  </td>
                  <td className="py-3.5 px-6 font-mono text-xs text-text-secondary">
                    #{ev.log_index}
                  </td>
                  <td className="py-3.5 px-6 font-mono text-xs text-text-primary max-w-xs truncate">
                    {ev.decoded_params ? (
                      <span className="text-emerald-400">
                        {JSON.stringify(ev.decoded_params).slice(0, 48)}...
                      </span>
                    ) : (
                      <span className="text-text-secondary">Raw Topics</span>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <StatusBadge status={ev.is_canonical ? "canonical" : "orphaned"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Detail Drawer / Modal with Decoded JSON */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent-cyan" />
                <h3 className="font-bold text-lg text-text-primary font-mono">
                  {selectedEvent.event_name || "Decoded Event"} Details
                </h3>
                <StatusBadge status={selectedEvent.is_canonical ? "canonical" : "orphaned"} />
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-elevated"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle Tabs */}
            <div className="flex items-center gap-2 border-b border-border pb-2 text-xs font-mono">
              <button
                onClick={() => setActiveTab("decoded")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-colors ${
                  activeTab === "decoded" ? "bg-accent-cyan text-background" : "text-text-secondary hover:text-text-primary bg-elevated"
                }`}
              >
                <Braces className="w-3.5 h-3.5" /> Decoded Parameters
              </button>
              <button
                onClick={() => setActiveTab("raw")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-colors ${
                  activeTab === "raw" ? "bg-accent-cyan text-background" : "text-text-secondary hover:text-text-primary bg-elevated"
                }`}
              >
                <Code className="w-3.5 h-3.5" /> Raw Log & Topics
              </button>
            </div>

            {activeTab === "decoded" ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-elevated border border-border space-y-1">
                  <span className="text-text-secondary uppercase text-[10px]">Event Signature</span>
                  <div className="text-accent-cyan break-all font-semibold">{selectedEvent.event_signature || selectedEvent.topic0}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-elevated border border-border">
                    <span className="text-text-secondary uppercase text-[10px] block">Contract Address</span>
                    <span className="text-text-primary break-all">{selectedEvent.contract_address}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-elevated border border-border">
                    <span className="text-text-secondary uppercase text-[10px] block">Block & Log Index</span>
                    <span className="text-text-primary">
                      Block #{formatNumber(selectedEvent.block_number)} (Log #{selectedEvent.log_index})
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#090D16] border border-border space-y-1">
                  <span className="text-text-secondary uppercase text-[10px]">Decoded Parameters (JSON Payload)</span>
                  <pre className="text-emerald-400 p-2 overflow-x-auto text-[11px] leading-relaxed">
                    {JSON.stringify(selectedEvent.decoded_params, null, 2) || "{}"}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-elevated border border-border">
                  <span className="text-text-secondary uppercase text-[10px] block">Topic 0</span>
                  <span className="text-accent-cyan break-all">{selectedEvent.topic0 || "None"}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-elevated border border-border">
                  <span className="text-text-secondary uppercase text-[10px] block">Topic 1</span>
                  <span className="text-text-primary break-all">{selectedEvent.topic1 || "None"}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-elevated border border-border">
                  <span className="text-text-secondary uppercase text-[10px] block">Topic 2</span>
                  <span className="text-text-primary break-all">{selectedEvent.topic2 || "None"}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#090D16] border border-border">
                  <span className="text-text-secondary uppercase text-[10px] block">Data Payload</span>
                  <div className="text-text-secondary break-all max-h-24 overflow-y-auto">{selectedEvent.raw_data || "0x"}</div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-lg bg-elevated text-xs font-semibold text-text-primary hover:bg-accent-cyan hover:text-background transition-colors font-mono"
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
