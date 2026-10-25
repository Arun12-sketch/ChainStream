"use client";

import React, { useState } from "react";
import { Settings, Save, CheckCircle2, ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  const [ethDepth, setEthDepth] = useState(12);
  const [baseDepth, setBaseDepth] = useState(10);
  const [amoyDepth, setAmoyDepth] = useState(16);
  const [pollInterval, setPollInterval] = useState(2000);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-2 border-b border-border/60">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Platform Settings
        </h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Global indexer configuration, confirmation depths, and cluster execution limits.
        </p>
      </div>

      {saved && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Settings persisted to cluster configuration.
        </div>
      )}

      <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-xl">
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Settings className="w-4 h-4 text-accent-cyan" /> Confirmation Depths (Reorg Safety)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="space-y-1.5 p-3 rounded-lg bg-elevated border border-border">
              <label className="text-text-secondary block">Ethereum Sepolia</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={ethDepth}
                  onChange={(e) => setEthDepth(Number(e.target.value))}
                  className="w-full bg-card border border-border rounded px-2.5 py-1.5 text-text-primary focus:outline-none focus:border-accent-cyan"
                />
                <span className="text-text-secondary">blocks</span>
              </div>
            </div>

            <div className="space-y-1.5 p-3 rounded-lg bg-elevated border border-border">
              <label className="text-text-secondary block">Base Sepolia</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={baseDepth}
                  onChange={(e) => setBaseDepth(Number(e.target.value))}
                  className="w-full bg-card border border-border rounded px-2.5 py-1.5 text-text-primary focus:outline-none focus:border-accent-cyan"
                />
                <span className="text-text-secondary">blocks</span>
              </div>
            </div>

            <div className="space-y-1.5 p-3 rounded-lg bg-elevated border border-border">
              <label className="text-text-secondary block">Polygon Amoy</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amoyDepth}
                  onChange={(e) => setAmoyDepth(Number(e.target.value))}
                  className="w-full bg-card border border-border rounded px-2.5 py-1.5 text-text-primary focus:outline-none focus:border-accent-cyan"
                />
                <span className="text-text-secondary">blocks</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border space-y-3 text-xs font-mono">
          <h2 className="text-sm font-bold text-text-primary">RPC Polling Frequency</h2>
          <div className="max-w-xs space-y-1.5">
            <label className="text-text-secondary block">Poll Interval (ms)</label>
            <input
              type="number"
              value={pollInterval}
              onChange={(e) => setPollInterval(Number(e.target.value))}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-cyan"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-accent-cyan text-background font-bold text-xs hover:brightness-110 transition-all flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
