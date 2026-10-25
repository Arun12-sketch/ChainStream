import React from "react";
import { cn } from "@/lib/utils";

interface ChainBadgeProps {
  chainId: number;
  className?: string;
}

export function ChainBadge({ chainId, className }: ChainBadgeProps) {
  let name = `Chain ${chainId}`;
  let color = "text-slate-400 bg-slate-900 border-slate-700";

  switch (chainId) {
    case 11155111:
      name = "Ethereum Sepolia";
      color = "text-cyan-300 bg-cyan-950/40 border-cyan-800/50";
      break;
    case 84532:
      name = "Base Sepolia";
      color = "text-blue-300 bg-blue-950/40 border-blue-800/50";
      break;
    case 80002:
      name = "Polygon Amoy";
      color = "text-purple-300 bg-purple-950/40 border-purple-800/50";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-medium border",
        color,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {name}
    </span>
  );
}
