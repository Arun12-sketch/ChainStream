"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Globe, Wifi, WifiOff, FileText, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopbarProps {
  selectedChain: number;
  onSelectChain: (chainId: number) => void;
}

export function Topbar({ selectedChain, onSelectChain }: TopbarProps) {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Check connection to WebSocket or backend
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/api/v1/ws";
    try {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => setIsConnected(true);
      ws.onerror = () => setIsConnected(false);
      ws.onclose = () => setIsConnected(false);
      return () => ws.close();
    } catch {
      setIsConnected(false);
    }
  }, []);

  return (
    <header className="h-16 bg-sidebar/80 backdrop-blur-md border-b border-border px-6 flex items-center justify-between z-20 sticky top-0">
      {/* Global Chain Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-sm">
          <Globe className="w-4 h-4 text-accent-cyan" />
          <select
            value={selectedChain}
            onChange={(e) => onSelectChain(Number(e.target.value))}
            className="bg-transparent text-sm font-medium text-text-primary focus:outline-none cursor-pointer font-sans"
          >
            <option value={0} className="bg-card text-text-primary">
              All Networks (Multi-Chain)
            </option>
            <option value={11155111} className="bg-card text-text-primary">
              Ethereum Sepolia (11155111)
            </option>
            <option value={84532} className="bg-card text-text-primary">
              Base Sepolia (84532)
            </option>
            <option value={80002} className="bg-card text-text-primary">
              Polygon Amoy (80002)
            </option>
          </select>
        </div>

        {/* Live WebSocket Status Pill */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border",
            isConnected
              ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/50"
              : "bg-slate-900/60 text-slate-400 border-slate-800"
          )}
        >
          {isConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-status-healthy animate-pulse" />
              <span>WS CONNECTED</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-text-secondary" />
              <span>WS POLLING</span>
            </>
          )}
        </div>
      </div>

      {/* Right Action Icons & Search */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search block / tx hash / address..."
            className="w-64 bg-card border border-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent-cyan transition-colors font-mono"
          />
        </div>

        {/* API Docs Link */}
        <a
          href="http://localhost:8080/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-accent-cyan transition-colors px-2.5 py-1.5 rounded-lg hover:bg-card border border-transparent hover:border-border"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">API Docs</span>
        </a>

        {/* Alerts / Activity indicator */}
        <button
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-card rounded-lg border border-transparent hover:border-border transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent-cyan" />
        </button>

        {/* Dev Profile Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-elevated border border-accent-cyan/40 flex items-center justify-center text-xs font-bold text-accent-cyan font-mono">
            OP
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-medium text-text-primary">Infra Operator</span>
            <span className="text-[10px] font-mono text-accent-cyan">admin@chainstream</span>
          </div>
        </div>
      </div>
    </header>
  );
}
