"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewLinkPage() {
  const [destination, setDestination] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, slug: slug || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        const detail = data.details
          ? Object.values(data.details).map((v) => (v as string[]).join(", ")).join("; ")
          : "";
        setError(detail || data.error || "Failed to create link");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">New link</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="destination" className="block text-sm font-medium mb-1">Destination URL</label>
          <input
            id="destination"
            type="url"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            placeholder="https://example.com"
            className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </div>
        <div>
          <label htmlFor="slug" className="block text-sm font-medium mb-1">
            Custom slug <span className="text-zinc-400">(optional)</span>
          </label>
          <div className="flex items-center">
            <span className="text-sm text-zinc-400 mr-2 font-mono">/s/</span>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
              placeholder="my-custom-slug"
              className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <p className="text-xs text-zinc-400 mt-1">Lowercase letters, numbers, hyphens, and underscores only.</p>
        </div>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create link"}
        </button>
      </form>
    </div>
  );
}
