"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="px-2.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-xs font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-pointer shrink-0"
    >
      {copied ? "Copied!" : label || "Copy"}
    </button>
  );
}
