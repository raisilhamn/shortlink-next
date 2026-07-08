"use client";

import { useState } from "react";
import { toast } from "sonner";

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

export default function ReportList({ initialReports }: { initialReports: Report[] }) {
  const [reports, setReports] = useState(initialReports);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleAction(reportId: string, action: "dismissed" | "actioned") {
    setPendingId(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to process report");
        return;
      }
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast.success(action === "dismissed" ? "Report dismissed" : "Report marked as actioned");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <p>No pending reports.</p>
      </div>
    );
  }

  return (
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
                rel="noopener noreferrer"
                className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                /s/{report.slug}
              </a>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                {report.category}
              </span>
              <span className="ml-1 text-xs text-zinc-400">
                ({report.reportCount} pending {report.reportCount === 1 ? "report" : "reports"})
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
              disabled={pendingId === report.id}
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50 cursor-pointer"
            >
              Dismiss
            </button>
            <button
              onClick={() => handleAction(report.id, "actioned")}
              disabled={pendingId === report.id}
              className="px-3 py-1.5 text-xs rounded-lg bg-yellow-200 dark:bg-yellow-900 hover:bg-yellow-300 dark:hover:bg-yellow-800 disabled:opacity-50 cursor-pointer"
            >
              Flag as actioned
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
