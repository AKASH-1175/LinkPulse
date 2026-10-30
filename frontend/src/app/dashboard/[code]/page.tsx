"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  MousePointerClick,
  Calendar,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Compass,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getLinkStats, LinkStats } from "@/lib/api";

function StatsContent() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;

  const [stats, setStats] = useState<LinkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStats = async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getLinkStats(code);
      setStats(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load statistics for this link.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [code]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const formatExpiryStatus = (expiresAtStr: string | null) => {
    if (!expiresAtStr) return { label: "Permanent", isExpired: false };
    const expiresDate = new Date(expiresAtStr);
    const isExpired = expiresDate <= new Date();
    return {
      label: isExpired ? "Expired" : `Expires ${expiresDate.toLocaleDateString()}`,
      isExpired,
    };
  };

  // Helper for progress bar calculation
  const renderBreakdown = (
    title: string,
    icon: React.ReactNode,
    items: { name: string; count: number }[],
    emptyLabel = "No data yet"
  ) => {
    const total = items.reduce((sum, item) => sum + item.count, 0) || 1;

    return (
      <div className="p-5 rounded-2xl bg-[#111a2e]/90 border border-white/10 glow-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-white/5 text-indigo-400">{icon}</div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4">{emptyLabel}</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => {
              const percent = Math.round((item.count / total) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium truncate max-w-[160px]">
                      {item.name}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {item.count} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Refresh analytics"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="h-24 bg-white/5 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-white/5 rounded-2xl" />
            ))}
          </div>
          <div className="h-72 bg-white/5 rounded-2xl" />
        </div>
      )}

      {/* Error / 404 State */}
      {error && !loading && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Analytics Unavailable</h2>
          <p className="text-xs text-rose-300 mt-1 max-w-sm mx-auto">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      )}

      {/* Main Stats Display */}
      {stats && !loading && (
        <>
          {/* Header Card */}
          <div className="p-6 rounded-2xl bg-[#111a2e]/90 border border-white/10 glow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white font-mono flex items-center gap-2">
                  <span>/{stats.code}</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                  Short Code
                </span>
                {formatExpiryStatus(stats.expires_at).isExpired ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                    Expired
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2 truncate max-w-xl">
                Destination:{" "}
                <a
                  href={stats.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>{stats.original_url}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            <button
              onClick={() => handleCopy(stats.code)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer self-start md:self-auto"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Code Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* 4 Stat Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Clicks */}
            <div className="p-5 rounded-2xl bg-[#111a2e]/90 border border-white/10 glow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Clicks</span>
                <MousePointerClick className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-2">{stats.total_clicks}</div>
              <p className="text-[11px] text-slate-500 mt-1">Recorded via HTTP 302 redirects</p>
            </div>

            {/* 2. Created Date */}
            <div className="p-5 rounded-2xl bg-[#111a2e]/90 border border-white/10 glow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Created At</span>
                <Calendar className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-lg font-bold text-white mt-2">
                {new Date(stats.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {new Date(stats.created_at).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })} UTC
              </p>
            </div>

            {/* 3. Expiry Status */}
            <div className="p-5 rounded-2xl bg-[#111a2e]/90 border border-white/10 glow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expiry Status</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-white mt-2">
                {formatExpiryStatus(stats.expires_at).label}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {stats.expires_at ? "Automated 410 response" : "Link will not expire"}
              </p>
            </div>

            {/* 4. Top Referrer */}
            <div className="p-5 rounded-2xl bg-[#111a2e]/90 border border-white/10 glow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Top Referrer</span>
                <Globe className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-lg font-bold text-white mt-2 truncate">
                {stats.referrers.length > 0 ? stats.referrers[0].name : "Direct"}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {stats.referrers.length > 0 ? `${stats.referrers[0].count} clicks` : "No referrer data"}
              </p>
            </div>
          </div>

          {/* 14-Day Clicks Chart */}
          <div className="p-6 rounded-2xl bg-[#111a2e]/90 border border-white/10 glow-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Clicks Over Time</h3>
                <p className="text-xs text-slate-400">Last 14 days activity trend (UTC zero-filled)</p>
              </div>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                14 Days
              </span>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.clicks_by_day}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(str) => {
                      try {
                        const parts = str.split("-");
                        return `${parts[1]}/${parts[2]}`;
                      } catch {
                        return str;
                      }
                    }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#090d16",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "0.75rem",
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                    }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorClicks)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Lists: Browsers, Devices, OS, Referrers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderBreakdown(
              "Top Browsers",
              <Compass className="w-4 h-4" />,
              stats.browsers,
              "No browser data yet"
            )}
            {renderBreakdown(
              "Operating Systems",
              <Monitor className="w-4 h-4" />,
              stats.os,
              "No OS data yet"
            )}
            {renderBreakdown(
              "Devices",
              <Smartphone className="w-4 h-4" />,
              stats.devices,
              "No device data yet"
            )}
            {renderBreakdown(
              "Top 5 Referrers",
              <Globe className="w-4 h-4" />,
              stats.referrers,
              "No referrer data yet"
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function LinkStatsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white/5 rounded-2xl" />
          ))}
        </div>
        <div className="h-72 bg-white/5 rounded-2xl" />
      </div>
    }>
      <StatsContent />
    </Suspense>
  );
}
