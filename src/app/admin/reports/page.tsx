"use client";

import { useState, useEffect } from "react";

interface Report {
  id: string;
  linkId: string;
  category: string;
  description: string | null;
  createdAt: number;
  destination: string;
  slug: string;
  linkStatus: string;
  reportCount: number;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      setError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  async function handleAction(reportId: string, action: string, note?: string) {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
      }
    } catch {
      setError("Failed to process report");
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-10 text-zinc-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <a href="/admin" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
        &larr; Back to admin
      </a>
      <h1 className="text-2xl font-bold mt-2 mb-6">Pending reports</h1>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm mb-4">
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <p>No pending reports.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <a
                    href={`/s/${report.slug}`}
                    target="_blank"
                    className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    /s/{report.slug}
                  </a>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                    {report.category}
                  </span>
                  <span className="ml-1 text-xs text-zinc-400">
                    ({report.reportCount} reports)
                  </span>
                </div>
                <span className="text-xs text-zinc-400">
                  {new Date(report.createdAt * 1000).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate mb-2">
                {report.destination}
              </p>
              {report.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-3 italic">
                  &ldquo;{report.description}&rdquo;
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(report.id, "dismissed")}
                  className="px-3 py-1.5 text-xs rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleAction(report.id, "actioned")}
                  className="px-3 py-1.5 text-xs rounded-lg bg-yellow-200 dark:bg-yellow-900 hover:bg-yellow-300 dark:hover:bg-yellow-800"
                >
                  Flag as actioned
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
