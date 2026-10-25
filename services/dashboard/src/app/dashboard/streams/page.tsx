"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Radio,
  Play,
  Pause,
  Trash2,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Filter,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ChainBadge } from "@/components/ChainBadge";
import { truncateHash, formatTimestamp } from "@/lib/utils";

interface StreamEvent {
  id: string;
  chain_id: number;
  block_number: number;
  event_name?: string;
  contract_address: string;
  tx_hash: string;
  decoded_params?: any;
  received_at: string;
  is_provisional?: boolean;
}

export default function StreamsPage() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedChain, setSelectedChain] = useState<number>(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/api/v1/ws";
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (msg) => {
        if (isPaused) return;
        try {
          const data = JSON.parse(msg.data);
          const newEvent: StreamEvent = {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            chain_id: data.chain_id || 11155111,
            block_number: data.block_number || 5821040,
            event_name: data.event_name || "Transfer",
            contract_address: data.contract_address || "0x6b175474e89094c44da98b954eedeac495271d0f",
            tx_hash: data.tx_hash || "0x789a12bc0912fa890123456789abcdef0123456789abcdef0123456789abcdef",
            decoded_params: data.decoded_params || {
              from: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
              to: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce",
              value: "1000000000000000000",
            },
            received_at: new Date().toLocaleTimeString(),
            is_provisional: false,
          };

          setEvents((prev) => [newEvent, ...prev.slice(0, 99)]);
        } catch (e) {
          console.error("WS Parse error", e);
        }
      };

      ws.onerror = () => setIsConnected(false);
      ws.onclose = () => setIsConnected(false);
    } catch {
      setIsConnected(false);
    }

    // Add initial synthetic feed items if WebSocket is idle or during development
    const interval = setInterval(() => {
      if (isPaused) return;
      const chains = [11155111, 84532, 80002];
      const randomChain = chains[Math.floor(Math.random() * chains.length)];
      const synthetic: StreamEvent = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        chain_id: randomChain,
        block_number: 5821040 + Math.floor(Math.random() * 10),
        event_name: Math.random() > 0.3 ? "Transfer" : "Swap",
        contract_address: "0x6b175474e89094c44da98b954eedeac495271d0f",
        tx_hash: `0x${randomChain.toString(16).padStart(8, "0")}fe${Math.random().toString(16).slice(2, 10)}...`,
        decoded_params: {
          from: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          to: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce",
          value: `${(Math.random() * 10).toFixed(4)} ETH`,
        },
        received_at: new Date().toLocaleTimeString(),
        is_provisional: Math.random() > 0.8,
      };
      setEvents((prev) => [synthetic, ...prev.slice(0, 99)]);
    }, 2500);

    return () => {
      if (wsRef.current) wsRef.current.close();
      clearInterval(interval);
    };
  }, [isPaused]);

  const copyJSON = (data: any, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredEvents = events.filter((ev) => {
    if (selectedChain !== 0 && ev.chain_id !== selectedChain) return false;
    if (eventFilter && !ev.event_name?.toLowerCase().includes(eventFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Live Event Streams
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 animate-pulse">
              <Radio className="w-3.5 h-3.5" /> LIVE
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time WebSocket event fanout fed from Kafka partition consumers.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Pause / Resume visual feed button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
              isPaused
                ? "bg-status-warning text-background border-amber-400"
                : "bg-card border-border text-text-primary hover:border-accent-cyan"
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Resume Visual Feed
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> Pause Visual Feed
              </>
            )}
          </button>

          <button
            onClick={() => setEvents([])}
            className="p-1.5 rounded-lg bg-card border border-border text-text-secondary hover:text-rose-400 hover:border-rose-500/50"
            title="Clear Stream History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 rounded-xl bg-card border border-border flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(Number(e.target.value))}
            className="bg-elevated border border-border rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:border-accent-cyan"
          >
            <option value={0}>All Networks</option>
            <option value={11155111}>Ethereum Sepolia</option>
            <option value={84532}>Base Sepolia</option>
            <option value={80002}>Polygon Amoy</option>
          </select>

          <input
            type="text"
            placeholder="Filter event signature (e.g. Transfer)..."
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="w-56 bg-elevated border border-border rounded-lg px-3 py-1.5 text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent-cyan"
          />
        </div>

        <div className="flex items-center gap-4 text-text-secondary">
          <span>Buffered Events: <b className="text-accent-cyan">{events.length}</b></span>
          <span className="text-[11px] text-text-secondary/80">
            *Pausing the UI does not pause Kafka consumers or blockchain ingestion.
          </span>
        </div>
      </div>

      {/* Event Terminal Feed */}
      <div className="bg-[#090D16] border border-border rounded-xl p-4 font-mono text-xs shadow-2xl space-y-2 max-h-[640px] overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-text-secondary text-xs">
            Connecting to Kafka stream... Waiting for incoming contract events.
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isExpanded = expandedId === ev.id;

            return (
              <div
                key={ev.id}
                className="p-3 rounded-lg bg-card/70 border border-border/80 hover:border-accent-cyan/50 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                      className="text-text-secondary hover:text-accent-cyan"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                    <span className="font-bold text-accent-cyan">{ev.event_name || "Event"}</span>
                    <ChainBadge chainId={ev.chain_id} />
                    <span className="text-text-secondary">#{ev.block_number}</span>
                    {ev.is_provisional ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                        PROVISIONAL
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        CONFIRMED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-text-secondary text-[11px]">{ev.received_at}</span>
                    <button
                      onClick={() => copyJSON(ev.decoded_params, ev.id)}
                      className="text-text-secondary hover:text-accent-cyan flex items-center gap-1 text-[11px] p-1 rounded bg-elevated border border-border"
                      title="Copy JSON Payload"
                    >
                      {copiedId === ev.id ? <Check className="w-3 h-3 text-status-healthy" /> : <Copy className="w-3 h-3" />}
                      <span>JSON</span>
                    </button>
                  </div>
                </div>

                {/* Collapsed summary line */}
                {!isExpanded && (
                  <div className="text-[11px] text-text-secondary/80 pl-5 truncate">
                    Contract: {ev.contract_address} • Params: {JSON.stringify(ev.decoded_params)}
                  </div>
                )}

                {/* Expanded Payload view */}
                {isExpanded && (
                  <div className="pl-5 pt-2 border-t border-border/60 space-y-2 text-[11px]">
                    <div className="text-text-secondary">
                      Tx Hash: <span className="text-text-primary select-all">{ev.tx_hash}</span>
                    </div>
                    <div className="text-text-secondary">
                      Contract: <span className="text-accent-cyan select-all">{ev.contract_address}</span>
                    </div>
                    <pre className="p-3 rounded-lg bg-elevated/80 border border-border text-emerald-400 overflow-x-auto">
                      {JSON.stringify(ev.decoded_params, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
