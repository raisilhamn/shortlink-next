"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/dialog";

export default function EditLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [destination, setDestination] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchLink() {
      try {
        const res = await fetch(`/api/links/${id}`);
        if (!res.ok) {
          if (res.status === 401) return router.push("/login");
          throw new Error(res.status === 404 ? "Link not found" : "Failed to load link");
        }
        const data = await res.json();
        if (cancelled) return;
        setDestination(data.link.destination);
        setSlug(data.link.slug);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load link");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchLink();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch(`/api/links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, slug }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data.details
          ? Object.values(data.details).map((v) => (v as string[]).join(", ")).join("; ")
          : "";
        setError(detail || data.error || "Failed to update");
        return;
      }

      toast.success("Link updated");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setError("");
    setSaving(true);

    try {
      const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete");
        return;
      }
      toast.success("Link deleted");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="max-w-lg mx-auto px-4 py-10 flex justify-center">
      <svg className="animate-spin h-6 w-6 text-zinc-400" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
        &larr; Back to dashboard
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-8">Edit link</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="destination" className="block text-sm font-medium mb-1">Destination URL</label>
          <input
            id="destination"
            type="url"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </div>
        <div>
          <label htmlFor="slug" className="block text-sm font-medium mb-1">Slug</label>
          <div className="flex items-center">
            <span className="text-sm text-zinc-400 mr-2 font-mono">/s/</span>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
              required
              minLength={3}
              maxLength={32}
              className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Changing the slug keeps the old address working as an alias.
          </p>
        </div>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{error}</div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 cursor-pointer"
              >
                Delete
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this link?</DialogTitle>
                <DialogDescription>
                  /s/{slug} will stop working and its click history will be permanently deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <button className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                    Cancel
                  </button>
                </DialogClose>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  Delete link
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </form>
    </div>
  );
}
