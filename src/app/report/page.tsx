"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

function ReportForm() {
  const searchParams = useSearchParams();
  const linkId = searchParams.get("linkId") || "";

  const [category, setCategory] = useState("spam");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, category, description: description || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to submit report");
        return;
      }

      setDone(true);
      toast.success("Report submitted");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!linkId) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">Nothing to report</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">
          This page can only be reached from a short link&apos;s &ldquo;Report this link&rdquo; button.
        </p>
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
          Back to homepage
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">Thank you</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">Your report has been submitted for review.</p>
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">Back to homepage</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Report this link</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-2">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
          >
            <option value="phishing">Phishing</option>
            <option value="malware">Malware / drive-by download</option>
            <option value="spam">Spam</option>
            <option value="adult">Adult / NSFW content</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description <span className="text-zinc-400">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit report"}
        </button>
      </form>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportForm />
    </Suspense>
  );
}
