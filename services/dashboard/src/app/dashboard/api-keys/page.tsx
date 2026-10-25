"use client";

import React, { useEffect, useState } from "react";
import { Key, Plus, Trash2, Copy, Check, Play, Terminal, Code, AlertCircle, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { ApiKey } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [rateLimit, setRateLimit] = useState(120);
  const [createdKeySecret, setCreatedKeySecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Playground state
  const [playgroundChain, setPlaygroundChain] = useState(11155111);
  const [playgroundEndpoint, setPlaygroundEndpoint] = useState("/api/v1/chains/{chainId}/stats");
  const [playgroundResponse, setPlaygroundResponse] = useState<any>(null);
  const [playgroundStatus, setPlaygroundStatus] = useState<number | null>(null);
  const [playgroundLatency, setPlaygroundLatency] = useState<number | null>(null);
  const [playgroundExecuting, setPlaygroundExecuting] = useState(false);
  const [codeLang, setCodeLang] = useState<"curl" | "js" | "go">("curl");

  const loadKeys = async () => {
    try {
      setLoading(true);
      const data = await api.getApiKeys();
      setKeys(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const created = await api.createApiKey(newKeyName.trim(), rateLimit);
      setKeys([created, ...keys]);
      setCreatedKeySecret(created.secret_key || "cs_live_dev_test_secret_created");
      setNewKeyName("");
    } catch (err) {
      console.error("Failed to create key", err);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;
    try {
      await api.revokeApiKey(id);
      setKeys(keys.filter((k) => k.id !== id));
    } catch (err) {
      console.error("Failed to revoke key", err);
    }
  };

  const executePlayground = async () => {
    setPlaygroundExecuting(true);
    const start = performance.now();
    try {
      const path = playgroundEndpoint.replace("{chainId}", playgroundChain.toString());
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const res = await fetch(`${baseUrl}${path}`);
      const data = await res.json();
      setPlaygroundStatus(res.status);
      setPlaygroundResponse(data);
      setPlaygroundLatency(Math.round(performance.now() - start));
    } catch (err: any) {
      setPlaygroundStatus(500);
      setPlaygroundResponse({ error: "Failed to connect to backend", details: err.message });
      setPlaygroundLatency(Math.round(performance.now() - start));
    } finally {
      setPlaygroundExecuting(false);
    }
  };

  const resolvedEndpoint = playgroundEndpoint.replace("{chainId}", playgroundChain.toString());

  const getCurlSnippet = () => {
    return `curl -X GET "http://localhost:8080${resolvedEndpoint}" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Accept: application/json"`;
  };

  const getJsSnippet = () => {
    return `const res = await fetch("http://localhost:8080${resolvedEndpoint}", {
  headers: {
    "X-API-Key": "YOUR_API_KEY",
    "Accept": "application/json"
  }
});
const data = await res.json();
console.log(data);`;
  };

  const getGoSnippet = () => {
    return `req, _ := http.NewRequest("GET", "http://localhost:8080${resolvedEndpoint}", nil)
req.Header.Set("X-API-Key", "YOUR_API_KEY")
req.Header.Set("Accept", "application/json")

resp, err := http.DefaultClient.Do(req)
if err != nil {
    log.Fatal(err)
}
defer resp.Body.Close()`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-2 border-b border-border/60">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          API Keys & Developer Playground
        </h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Generate API keys for protected endpoints, inspect per-key rate limits, and test queries in the interactive playground.
        </p>
      </div>

      {/* Copy-once Secret Banner */}
      {createdKeySecret && (
        <div className="p-4 rounded-xl bg-cyan-950/40 border border-accent-cyan/60 space-y-2 glow-cyan-subtle">
          <div className="flex items-center gap-2 text-accent-cyan font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            API Key Created Successfully
          </div>
          <p className="text-xs text-text-secondary">
            Please copy this secret key now. For security purposes, this secret key will never be displayed again.
          </p>
          <div className="flex items-center gap-2 pt-1 font-mono text-xs">
            <input
              type="text"
              readOnly
              value={createdKeySecret}
              className="w-full max-w-xl bg-card border border-border rounded-lg px-3 py-2 text-accent-cyan select-all"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdKeySecret);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-3 py-2 rounded-lg bg-accent-cyan text-background font-semibold flex items-center gap-1.5 hover:brightness-110"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy Secret"}
            </button>
          </div>
        </div>
      )}

      {/* Create Key Form & Keys List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Key Card */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Key className="w-4 h-4 text-accent-cyan" /> Generate API Key
          </h2>
          <form onSubmit={handleCreateKey} className="space-y-3 text-xs">
            <div>
              <label className="text-text-secondary block mb-1">Key Description / Name</label>
              <input
                type="text"
                placeholder="e.g. Production Ingestion Service"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                required
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-cyan font-mono"
              />
            </div>

            <div>
              <label className="text-text-secondary block mb-1">Rate Limit (Requests / Min)</label>
              <select
                value={rateLimit}
                onChange={(e) => setRateLimit(Number(e.target.value))}
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-cyan font-mono"
              >
                <option value={120}>120 req / min (Standard Developer)</option>
                <option value={300}>300 req / min (Pro Pipeline)</option>
                <option value={1000}>1,000 req / min (Enterprise)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-accent-cyan text-background font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Generate Key
            </button>
          </form>
        </div>

        {/* Managed Keys Table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-border bg-elevated/40">
            <h2 className="text-sm font-bold text-text-primary">Managed API Keys</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-elevated/60 uppercase text-text-secondary border-b border-border">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Prefix</th>
                  <th className="py-3 px-4">Rate Limit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Used</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-elevated/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-text-primary font-sans">{k.name}</td>
                    <td className="py-3 px-4 text-accent-cyan">{k.key_prefix}...</td>
                    <td className="py-3 px-4 text-text-secondary">{k.rate_limit_per_min} req/min</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={k.is_active ? "healthy" : "offline"} />
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {k.last_used_at ? formatTimestamp(k.last_used_at) : "Never"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="text-text-secondary hover:text-rose-400 p-1"
                        title="Revoke Key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Interactive API Playground */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-accent-cyan" />
            <h2 className="text-base font-bold text-text-primary font-sans">
              Interactive API Playground
            </h2>
          </div>
          <span className="text-xs font-mono text-text-secondary">Live Go API Backend</span>
        </div>

        {/* Playground Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-text-secondary block mb-1 font-mono">Target Chain</label>
            <select
              value={playgroundChain}
              onChange={(e) => setPlaygroundChain(Number(e.target.value))}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-cyan"
            >
              <option value={11155111}>Ethereum Sepolia (11155111)</option>
              <option value={84532}>Base Sepolia (84532)</option>
              <option value={80002}>Polygon Amoy (80002)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-text-secondary block mb-1 font-mono">Select Endpoint</label>
            <div className="flex gap-2">
              <select
                value={playgroundEndpoint}
                onChange={(e) => setPlaygroundEndpoint(e.target.value)}
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-cyan"
              >
                <option value="/api/v1/chains/{chainId}/stats">GET /api/v1/chains/{`{chainId}`}/stats</option>
                <option value="/api/v1/chains/{chainId}/blocks">GET /api/v1/chains/{`{chainId}`}/blocks</option>
                <option value="/api/v1/chains/{chainId}/blocks/latest">GET /api/v1/chains/{`{chainId}`}/blocks/latest</option>
                <option value="/api/v1/chains/{chainId}/transactions">GET /api/v1/chains/{`{chainId}`}/transactions</option>
                <option value="/api/v1/chains/{chainId}/events">GET /api/v1/chains/{`{chainId}`}/events</option>
                <option value="/api/v1/workers">GET /api/v1/workers</option>
                <option value="/api/v1/infrastructure">GET /api/v1/infrastructure</option>
                <option value="/api/v1/reorgs">GET /api/v1/reorgs</option>
              </select>

              <button
                onClick={executePlayground}
                disabled={playgroundExecuting}
                className="px-4 py-2 rounded-lg bg-accent-cyan text-background font-bold text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {playgroundExecuting ? "Sending..." : "Execute"}
              </button>
            </div>
          </div>
        </div>

        {/* Live Response & Code Snippets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Response Box */}
          <div className="bg-[#090D16] border border-border rounded-xl p-4 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-text-secondary border-b border-border/60 pb-2">
              <span>Response Payload</span>
              {playgroundStatus && (
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">{playgroundStatus} OK</span>
                  <span>({playgroundLatency} ms)</span>
                </div>
              )}
            </div>
            <pre className="text-slate-300 max-h-72 overflow-y-auto overflow-x-auto text-[11px] leading-relaxed p-1">
              {playgroundResponse
                ? JSON.stringify(playgroundResponse, null, 2)
                : '// Click "Execute" to run request against backend'}
            </pre>
          </div>

          {/* Code Snippets Box */}
          <div className="bg-[#090D16] border border-border rounded-xl p-4 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-text-secondary border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCodeLang("curl")}
                  className={`px-2 py-0.5 rounded ${codeLang === "curl" ? "bg-accent-cyan text-background font-bold" : "hover:text-text-primary"}`}
                >
                  cURL
                </button>
                <button
                  onClick={() => setCodeLang("js")}
                  className={`px-2 py-0.5 rounded ${codeLang === "js" ? "bg-accent-cyan text-background font-bold" : "hover:text-text-primary"}`}
                >
                  JavaScript
                </button>
                <button
                  onClick={() => setCodeLang("go")}
                  className={`px-2 py-0.5 rounded ${codeLang === "go" ? "bg-accent-cyan text-background font-bold" : "hover:text-text-primary"}`}
                >
                  Go
                </button>
              </div>
              <button
                onClick={() => {
                  const code = codeLang === "curl" ? getCurlSnippet() : codeLang === "js" ? getJsSnippet() : getGoSnippet();
                  navigator.clipboard.writeText(code);
                }}
                className="text-text-secondary hover:text-accent-cyan"
                title="Copy Snippet"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <pre className="text-cyan-200 max-h-72 overflow-y-auto overflow-x-auto text-[11px] leading-relaxed p-1">
              {codeLang === "curl" ? getCurlSnippet() : codeLang === "js" ? getJsSnippet() : getGoSnippet()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
