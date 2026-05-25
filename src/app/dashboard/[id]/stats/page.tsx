"use client";

import { useState, useEffect, use } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useRouter } from "next/navigation";

interface StatsData {
  totalClicks: number;
  uniqueVisitors: number;
  byCountry: { countryCode: string; countryName: string; count: number }[];
  byReferrer: { domain: string; count: number }[];
  byDay: { date: string; count: number }[];
}

export default function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/links/${id}/stats?days=${days}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) router.push("/login");
          throw new Error("Failed to load stats");
        }
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, days, router]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-10 text-zinc-400">Loading...</div>;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const ranges = [7, 30, 90];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <a href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          &larr; Back to dashboard
        </a>
        <h1 className="text-2xl font-bold mt-2">Link stats</h1>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {ranges.map((r) => (
          <button
            key={r}
            onClick={() => setDays(r)}
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

      {data.byDay.length > 0 && (
        <div className="mb-8 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold mb-4">Clicks by day</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e4e4e7",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#18181b",
                }}
              />
              <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.byCountry.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">By country</h2>
          <div className="space-y-1">
            {data.byCountry.map((c) => (
              <div key={c.countryCode || "unknown"} className="flex items-center justify-between text-sm py-1">
                <span>{c.countryName || c.countryCode || "Unknown"}</span>
                <span className="font-mono text-zinc-500">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.byReferrer.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Top referrers</h2>
          <div className="space-y-1">
            {data.byReferrer.map((r) => (
              <div key={r.domain} className="flex items-center justify-between text-sm py-1">
                <span>{r.domain}</span>
                <span className="font-mono text-zinc-500">{r.count}</span>
              </div>
            ))}
          </div>
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
