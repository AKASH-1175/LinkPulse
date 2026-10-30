"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  BarChart2,
  Clock,
  Sparkles,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { createLink, LinkItem } from "@/lib/api";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [expiryHours, setExpiryHours] = useState<string>("never");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<LinkItem | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("Please enter a valid destination URL.");
      return;
    }

    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      setError("URL must start with http:// or https://");
      return;
    }

    setLoading(true);

    try {
      const payload: { url: string; alias?: string; expires_in_hours?: number } = {
        url: trimmedUrl,
      };

      if (alias.trim()) {
        payload.alias = alias.trim();
      }

      if (expiryHours !== "never") {
        payload.expires_in_hours = parseFloat(expiryHours);
      }

      const result = await createLink(payload);
      setCreatedLink(result);
      setUrl("");
      setAlias("");
      setExpiryHours("never");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create short link. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  return (
    <div className="flex flex-col items-center justify-center pt-6 sm:pt-12 pb-16">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>Synchronous Serverless Telemetry &bull; Zero Freeze-Loss</span>
      </div>

      {/* Hero Headings */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-center max-w-3xl leading-[1.15]">
        Shorten Links. <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-cyan-400">
          Capture Pulse Analytics.
        </span>
      </h1>
      <p className="mt-4 text-base sm:text-lg text-slate-400 text-center max-w-xl">
        High-performance URL shortener with real-time browser, OS, and referrer telemetry powered by FastAPI and Supabase.
      </p>

      {/* Main Shortener Form Card */}
      <div className="w-full max-w-2xl mt-10 p-6 sm:p-8 rounded-2xl bg-[#111a2e]/90 border border-white/10 glow-card backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* URL Input */}
          <div>
            <label htmlFor="url" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Destination URL <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Link2 className="w-5 h-5" />
              </div>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-long-link.com/articles/cloud-computing"
                required
                className="w-full pl-11 pr-4 py-3 bg-[#090d16] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm sm:text-base transition-all"
              />
            </div>
          </div>

          {/* Optional Alias and Expiry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Custom Alias */}
            <div>
              <label htmlFor="alias" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Custom Alias <span className="text-slate-500 text-[10px]">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  id="alias"
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="e.g. project-demo"
                  maxLength={32}
                  className="w-full px-3.5 py-2.5 bg-[#090d16] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-all"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">3-32 characters (letters, numbers, _, -)</p>
            </div>

            {/* Expiry Dropdown */}
            <div>
              <label htmlFor="expiry" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Link Lifetime</span>
              </label>
              <select
                id="expiry"
                value={expiryHours}
                onChange={(e) => setExpiryHours(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#090d16] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition-all"
              >
                <option value="never">Never (Permanent)</option>
                <option value="1">1 Hour</option>
                <option value="24">24 Hours (1 Day)</option>
                <option value="168">7 Days (1 Week)</option>
                <option value="720">30 Days (1 Month)</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-500">HTTP 410 served after expiry</p>
            </div>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.99] cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Generating Short Link...</span>
              </>
            ) : (
              <>
                <span>Shorten & Capture Pulse</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Result Card */}
        {createdLink && (
          <div className="mt-8 pt-6 border-t border-white/10 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Short Link Ready
              </span>
              <span className="text-xs text-slate-400">Code: <code className="text-indigo-300 font-mono">{createdLink.code}</code></span>
            </div>

            {/* Short URL Box with Copy Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-xl bg-[#090d16] border border-indigo-500/30">
              <input
                type="text"
                readOnly
                value={createdLink.short_url}
                className="flex-1 bg-transparent text-white font-mono text-sm px-2 py-1 outline-none select-all"
              />
              <button
                type="button"
                onClick={() => handleCopy(createdLink.short_url)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Actions & Target info */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-400 truncate max-w-xs">
                Redirects to: <span className="text-slate-300">{createdLink.original_url}</span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={createdLink.short_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <span>Test Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <Link
                  href={`/dashboard/${createdLink.code}`}
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>View Stats</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mt-16">
        <div className="p-5 rounded-2xl bg-[#111a2e]/50 border border-white/5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">HTTP 302 Redirection</h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Strict HTTP 302 responses bypass browser cache and ensure all traffic telemetry arrives at the serverless backend.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#111a2e]/50 border border-white/5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
            <BarChart2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">Granular Analytics</h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Automatic User-Agent header breakdown into Browser, Operating System, Device classification, and Referrer domain.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#111a2e]/50 border border-white/5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">Configurable Expiry</h3>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Automatic time-based expiration that terminates links with HTTP 410 Gone, keeping your links timely and secure.
          </p>
        </div>
      </div>
    </div>
  );
}
