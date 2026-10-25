"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Activity,
  Layers,
  Box,
  ArrowRightLeft,
  Zap,
  Radio,
  Cpu,
  Server,
  Key,
  Settings,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: Activity },
  { label: "Chains", href: "/dashboard/chains", icon: Layers },
  { label: "Blocks", href: "/dashboard/blocks", icon: Box },
  { label: "Transactions", href: "/dashboard/transactions", icon: ArrowRightLeft },
  { label: "Events", href: "/dashboard/events", icon: Zap },
  { label: "Live Streams", href: "/dashboard/streams", icon: Radio, badge: "LIVE" },
  { label: "Indexer Workers", href: "/dashboard/workers", icon: Cpu },
  { label: "Infrastructure", href: "/dashboard/infrastructure", icon: Server },
  { label: "API Keys", href: "/dashboard/api-keys", icon: Key },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-sidebar border-r border-border flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-border gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-cyan to-accent-indigo flex items-center justify-center font-bold text-background glow-cyan-subtle">
            CS
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-text-primary text-base flex items-center gap-1.5">
              ChainStream
              <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
            </span>
            <span className="text-[10px] font-mono text-text-secondary tracking-widest uppercase">
              Control Center
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                  isActive
                    ? "bg-elevated text-accent-cyan border border-accent-cyan/30 shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-card/60"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-accent-cyan" : "text-text-secondary group-hover:text-text-primary")} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan font-bold border border-accent-cyan/40 animate-pulse">
                    {item.badge}
                  </span>
                ) : isActive ? (
                  <ChevronRight className="w-3.5 h-3.5 text-accent-cyan/60" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Cluster Status Footer */}
      <div className="p-4 border-t border-border bg-card/40 m-3 rounded-xl border">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-status-healthy" />
            <span className="font-medium text-text-primary">Cluster Status</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-status-healthy" />
        </div>
        <div className="mt-2 text-[11px] text-text-secondary flex justify-between font-mono">
          <span>Active Chains:</span>
          <span className="text-text-primary font-bold">3 / 3</span>
        </div>
        <div className="text-[11px] text-text-secondary flex justify-between font-mono">
          <span>Version:</span>
          <span className="text-accent-cyan font-bold">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
