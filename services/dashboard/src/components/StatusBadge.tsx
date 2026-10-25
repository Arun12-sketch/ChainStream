import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "canonical" | "orphaned" | "healthy" | "syncing" | "degraded" | "reorganizing" | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const s = status.toLowerCase();

  let colorClasses = "bg-slate-800 text-slate-300 border-slate-700";
  let dotColor = "bg-slate-400";
  let label = status;

  if (s === "canonical" || s === "healthy" || s === "active" || s === "confirmed") {
    colorClasses = "bg-emerald-950/60 text-emerald-400 border-emerald-800/60";
    dotColor = "bg-emerald-400";
  } else if (s === "orphaned" || s === "reorganizing" || s === "error" || s === "offline") {
    colorClasses = "bg-rose-950/60 text-rose-400 border-rose-800/60";
    dotColor = "bg-rose-400 animate-pulse";
  } else if (s === "syncing" || s === "warning" || s === "lagging") {
    colorClasses = "bg-amber-950/60 text-amber-400 border-amber-800/60";
    dotColor = "bg-amber-400";
  } else if (s === "provisional") {
    colorClasses = "bg-cyan-950/60 text-cyan-400 border-cyan-800/60";
    dotColor = "bg-cyan-400";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border uppercase tracking-wider",
        colorClasses,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", dotColor)} />
      {label}
    </span>
  );
}
