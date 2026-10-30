"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  BarChart3,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  RefreshCw,
  Search,
  Plus,
  AlertCircle,
  Calendar,
  Clock,
  MousePointerClick,
  LinkIcon,
} from "lucide-react";
import { listLinks, deleteLink, LinkItem } from "@/lib/api";

export default function DashboardPage() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const loadLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listLinks(100, 0);
      setLinks(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load shortened links.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const handleCopy = async (code: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDelete = async (code: string) => {
    if (!window.confirm(`Are you sure you want to delete short link '${code}'? Its click history will also be permanently removed.`)) {
      return;
    }

    setDeletingCode(code);
    try {
      await deleteLink(code);
      startTransition(() => {
        setLinks((prev) => prev.filter((l) => l.code !== code));
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete link";
      alert(msg);
    } finally {
      setDeletingCode(null);
    }
  };

  const filteredLinks = links.filter((l) => {
    const q = searchQuery.toLowerCase();
    return l.code.toLowerCase().includes(q) || l.original_url.toLowerCase().includes(q);
  });

  const totalClicksAcrossLinks = links.reduce((sum, item) => sum + (item.click_count || 0), 0);

  const formatExpiry = (expiresAtStr: string | null) => {
    if (!expiresAtStr) {
      return { label: "Permanent", status: "permanent" };
    }
    const expiresDate = new Date(expiresAtStr);
    const now = new Date();
    if (expiresDate <= now) {
      return { label: "Expired", status: "expired" };
    }
    return {
      label: `Expires ${expiresDate.toLocaleDateString()}`,
      status: "active",
    };
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-indigo-400" />
            <span>Links & Click Pulse</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your short URLs, inspect real-time click counts, and analyze traffic telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadLinks}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh link list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Link</span>
          </Link>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#111a2e]/90 border border-white/10 glow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Short Links</span>
            <LinkIcon className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mt-2">{links.length}</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#111a2e]/90 border border-white/10 glow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Clicks Tracked</span>
            <MousePointerClick className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mt-2">{totalClicksAcrossLinks}</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#111a2e]/90 border border-white/10 glow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Links</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mt-2">
            {links.filter((l) => !l.expires_at || new Date(l.expires_at) > new Date()).length}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter links by code or destination URL..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#111a2e]/80 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadLinks}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg text-xs font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="rounded-2xl bg-[#111a2e]/60 border border-white/10 p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredLinks.length === 0 && (
        <div className="rounded-2xl bg-[#111a2e]/60 border border-white/10 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center mb-4">
            <LinkIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No shortened links found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No links matched your query "${searchQuery}".`
              : "Get started by generating your first shortened URL with click tracking."}
          </p>
          {!searchQuery && (
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Link</span>
            </Link>
          )}
        </div>
      )}

      {/* Links Table */}
      {!loading && !error && filteredLinks.length > 0 && (
        <div className="rounded-2xl bg-[#111a2e]/80 border border-white/10 overflow-hidden glow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#090d16]/70 border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Short Link</th>
                  <th className="px-5 py-3.5">Original URL</th>
                  <th className="px-5 py-3.5 text-center">Clicks</th>
                  <th className="px-5 py-3.5">Created</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLinks.map((item) => {
                  const expiryMeta = formatExpiry(item.expires_at);
                  const isCopied = copiedCode === item.code;
                  const isDeleting = deletingCode === item.code;

                  return (
                    <tr key={item.code} className="hover:bg-white/[0.02] transition-colors">
                      {/* Short Code & Link */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-xs font-semibold">
                            {item.code}
                          </code>
                          <a
                            href={item.short_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-cyan-400 transition-colors"
                            title="Open short link (Redirects)"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Original URL (truncated) */}
                      <td className="px-5 py-4 max-w-xs truncate" title={item.original_url}>
                        <span className="text-slate-300 font-normal">{item.original_url}</span>
                      </td>

                      {/* Clicks */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold border border-cyan-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          {item.click_count || 0}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Expiry */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs">
                        {expiryMeta.status === "expired" ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium">
                            Expired
                          </span>
                        ) : expiryMeta.status === "permanent" ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 font-medium">
                            Permanent
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                            {expiryMeta.label}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy button */}
                          <button
                            type="button"
                            onClick={() => handleCopy(item.code, item.short_url)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="Copy short link"
                          >
                            {isCopied ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Stats Page */}
                          <Link
                            href={`/dashboard/${item.code}`}
                            className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors inline-flex items-center gap-1"
                            title="View click analytics"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Link>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(item.code)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Delete link"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
