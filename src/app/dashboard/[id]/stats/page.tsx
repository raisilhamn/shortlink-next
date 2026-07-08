"use client";

import { useState, useEffect, use, useSyncExternalStore } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface StatsData {
  totalClicks: number;
  uniqueVisitors: number;
  byCountry: { countryCode: string | null; countryName: string | null; count: number }[];
  byReferrer: { domain: string | null; count: number }[];
  byDay: { date: string; count: number }[];
}

const RANGES = [7, 30, 90];

function countryFlag(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/i.test(code)) return "🌐";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

// Recharts collapses days with no clicks, which distorts the time axis;
// fill the full selected range with zero counts.
function fillDays(byDay: { date: string; count: number }[], days: number) {
  const counts = new Map(byDay.map((d) => [d.date, d.count]));
  const out: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeToScheme(callback: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function useIsDark() {
  return useSyncExternalStore(
    subscribeToScheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false
  );
}

function ShareList({
  items,
}: {
  items: { key: string; icon?: string; label: string; count: number }[];
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0) || 1;
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const share = (item.count / total) * 100;
        return (
          <div key={item.key} className="text-sm">
            <div className="flex items-center justify-between gap-3 py-0.5">
              <span className="min-w-0 truncate">
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </span>
              <span className="font-mono text-zinc-500 shrink-0">
                {item.count}
                <span className="text-zinc-400 dark:text-zinc-600 ml-2 text-xs">
                  {share.toFixed(0)}%
                </span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-zinc-900 dark:bg-zinc-300"
                style={{ width: `${Math.max(share, 1.5)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const isDark = useIsDark();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/links/${id}/stats?days=${days}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) router.push("/login");
          throw new Error("Failed to load stats");
        }
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, days, router]);

  function selectDays(r: number) {
    if (r === days) return;
    setDays(r);
    setLoading(true);
    setError("");
  }

  if (loading && !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 flex justify-center">
        <svg className="animate-spin h-6 w-6 text-zinc-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const barFill = isDark ? "#e4e4e7" : "#18181b";
  const gridStroke = isDark ? "#3f3f46" : "#e4e4e7";
  const axisTick = { fontSize: 13, fill: "#71717a" };
  const byDay = fillDays(data.byDay, days);

  return (
    <div className={`max-w-4xl mx-auto px-4 py-10 ${loading ? "opacity-60 transition-opacity" : ""}`}>
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          &larr; Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold mt-2">Link Statistics</h1>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => selectDays(r)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer ${
              days === r
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {r}d
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <p className="text-2xl font-bold">{data.totalClicks}</p>
          <p className="text-sm text-zinc-500">Total clicks ({days}d)</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <p className="text-2xl font-bold">{data.uniqueVisitors}</p>
          <p className="text-sm text-zinc-500">Unique visitors ({days}d)</p>
        </div>
      </div>

      {data.totalClicks > 0 && (
        <div className="mb-8 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold mb-4">Clicks by day</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byDay} margin={{ top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.5} vertical={false} />
              <XAxis
                dataKey="date"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                interval="preserveStartEnd"
                minTickGap={24}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={36} />
              <Tooltip
                contentStyle={{
                  background: isDark ? "#18181b" : "#fff",
                  border: isDark ? "1px solid #3f3f46" : "1px solid #e4e4e7",
                  borderRadius: "8px",
                  fontSize: "14px",
                  color: isDark ? "#fafafa" : "#18181b",
                  padding: "8px 12px",
                }}
                labelStyle={{ color: "#71717a", marginBottom: 2 }}
                itemStyle={{ color: isDark ? "#fafafa" : "#18181b" }}
                formatter={(value) => [Number(value ?? 0), "clicks"]}
                cursor={{ fill: isDark ? "rgba(255,255,255,0.08)" : "rgba(24,24,27,0.06)" }}
              />
              <Bar dataKey="count" fill={barFill} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.byCountry.length > 0 && (
        <div className="mb-8 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold mb-4">By country</h2>
          <ShareList
            items={data.byCountry.map((c) => ({
              key: c.countryCode || "unknown",
              icon: countryFlag(c.countryCode),
              label: c.countryName || c.countryCode || "Unknown",
              count: c.count,
            }))}
          />
        </div>
      )}

      {data.byReferrer.length > 0 && (
        <div className="mb-8 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold mb-4">Top referrers</h2>
          <ShareList
            items={data.byReferrer.map((r) => ({
              key: r.domain || "direct",
              label: r.domain || "direct",
              count: r.count,
            }))}
          />
        </div>
      )}

      {data.totalClicks === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <p>No clicks yet. Share your link to get started.</p>
        </div>
      )}
    </div>
  );
}
