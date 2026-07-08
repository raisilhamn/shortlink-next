"use client";

import { useState, useSyncExternalStore, useCallback } from "react";
import { toast } from "sonner";
import CopyButton from "@/components/copy-button";

interface LinkItem {
  shortUrl: string;
  slug: string;
  destination: string;
  createdAt: number;
}

const HISTORY_KEY = "shortlink-history";
const EMPTY_HISTORY: LinkItem[] = [];

let historyCache: LinkItem[] = EMPTY_HISTORY;
let historyCacheRaw: string | null = null;
const historyListeners = new Set<() => void>();

function readHistory(): LinkItem[] {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (raw !== historyCacheRaw) {
    historyCacheRaw = raw;
    try {
      historyCache = raw ? (JSON.parse(raw) as LinkItem[]) : EMPTY_HISTORY;
    } catch {
      historyCache = EMPTY_HISTORY;
    }
  }
  return historyCache;
}

function writeHistory(items: LinkItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  historyListeners.forEach((listener) => listener());
}

function subscribeHistory(listener: () => void) {
  historyListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    historyListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function useLinkHistory() {
  const history = useSyncExternalStore(subscribeHistory, readHistory, () => EMPTY_HISTORY);

  const add = useCallback((item: LinkItem) => {
    writeHistory([item, ...readHistory().filter((h) => h.slug !== item.slug)].slice(0, 20));
  }, []);

  const clear = useCallback(() => {
    writeHistory([]);
  }, []);

  return { history, add, clear };
}

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{ shortUrl: string; slug: string; expiresAt: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const { history, add: addToHistory, clear: clearHistory } = useLinkHistory();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/links/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: url }),
      });

      const data = await res.json();

      if (!res.ok) {
        const detail = data.details
          ? Object.values(data.details).map((v) => (v as string[]).join(", ")).join("; ")
          : "";
        toast.error((data.error || "Failed to create link") + (detail ? ` — ${detail}` : ""));
        return;
      }

      setResult(data);
      addToHistory({ shortUrl: data.shortUrl, slug: data.slug, destination: url, createdAt: Date.now() });
      setUrl("");
      toast.success("Short link created!");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Shorten your links</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-lg">
          Paste a long URL and get a short link. No sign-up required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/very/long/url"
          required
          className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Shortening..." : "Shorten"}
        </button>
      </form>

      {result && (
        <div className="p-4 sm:p-6 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Your short link:</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0 ml-2">Expires in 7 days</span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base sm:text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline break-all px-3 py-2 sm:px-0 sm:py-0 rounded-lg bg-white dark:bg-zinc-800 sm:bg-transparent dark:sm:bg-transparent"
            >
              {result.shortUrl}
            </a>
            <CopyButton text={result.shortUrl} />
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Recent links</h2>
            <button
              onClick={clearHistory}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.slug}
                className="flex items-center gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={item.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline block truncate"
                  >
                    {item.shortUrl}
                  </a>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{item.destination}</p>
                </div>
                <CopyButton text={item.shortUrl} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
