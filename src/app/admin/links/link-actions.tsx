"use client";

import { useState } from "react";

interface LinkActionsProps {
  linkId: string;
  currentStatus: string;
}

export default function LinkActions({ linkId, currentStatus }: LinkActionsProps) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function updateStatus(newStatus: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setStatus(newStatus);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-1">
      {status === "active" ? (
        <>
          <button
            onClick={() => updateStatus("disabled")}
            disabled={loading}
            className="px-2 py-1 text-[10px] rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 disabled:opacity-50"
          >
            Deactivate
          </button>
          <button
            onClick={() => updateStatus("suspended")}
            disabled={loading}
            className="px-2 py-1 text-[10px] rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800 disabled:opacity-50"
          >
            Suspend
          </button>
        </>
      ) : (
        <button
          onClick={() => updateStatus("active")}
          disabled={loading}
          className="px-2 py-1 text-[10px] rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50"
        >
          {loading ? "..." : "Activate"}
        </button>
      )}
    </div>
  );
}
