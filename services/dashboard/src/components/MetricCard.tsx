import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  tooltip?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  unit,
  change,
  isPositive,
  icon: Icon,
  tooltip,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border/80 rounded-xl p-5 hover:border-accent-cyan/50 transition-all duration-200 group relative shadow-lg shadow-black/20",
        className
      )}
      title={tooltip}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {title}
        </span>
        <div className="p-2 rounded-lg bg-elevated/80 text-accent-cyan border border-border/60 group-hover:glow-cyan-subtle transition-all">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-text-primary">
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-text-secondary">{unit}</span>}
      </div>

      {change && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "font-mono font-medium",
              isPositive ? "text-status-healthy" : "text-status-warning"
            )}
          >
            {change}
          </span>
          <span className="text-text-secondary/70">vs last hour</span>
        </div>
      )}
    </div>
  );
}
