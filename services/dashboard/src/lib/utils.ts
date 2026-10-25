import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateHash(hash: string, start = 6, end = 4): string {
  if (!hash) return "";
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

export function formatNumber(num: number | string | undefined): string {
  if (num === undefined || num === null) return "0";
  const n = typeof num === "string" ? parseFloat(num) : num;
  return new Intl.NumberFormat().format(n);
}

export function formatTimestamp(isoOrSec: string | number): string {
  if (!isoOrSec) return "-";
  const date = typeof isoOrSec === "number" ? new Date(isoOrSec * 1000) : new Date(isoOrSec);
  return date.toLocaleString();
}

export function formatTimeAgo(isoOrSec: string | number): string {
  if (!isoOrSec) return "-";
  const date = typeof isoOrSec === "number" ? new Date(isoOrSec * 1000) : new Date(isoOrSec);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
