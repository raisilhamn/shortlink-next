"use client";

import { useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/dialog";

interface QrModalProps {
  url: string;
  slug: string;
}

export default function QrModal({ url, slug }: QrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateQr(open: boolean) {
    if (!open || qrDataUrl) return;
    setLoading(true);
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 384, margin: 2 });
      setQrDataUrl(dataUrl);
    } finally {
      setLoading(false);
    }
  }

  function download() {
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qrcode-${slug}.png`;
    a.click();
  }

  return (
    <Dialog onOpenChange={generateQr}>
      <DialogTrigger asChild>
        <button className="px-2.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-xs font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-pointer shrink-0">
          QR
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
          <DialogDescription>
            Scan to open /s/{slug}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          {loading ? (
            <div className="w-48 h-48 flex items-center justify-center text-zinc-400 text-sm">
              Generating...
            </div>
          ) : qrDataUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt={`QR code for /s/${slug}`} className="w-48 h-48" />
              <div className="flex gap-2">
                <button
                  onClick={download}
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  Download
                </button>
                <DialogClose asChild>
                  <button className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    Close
                  </button>
                </DialogClose>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
