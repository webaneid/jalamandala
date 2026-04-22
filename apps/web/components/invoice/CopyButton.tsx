"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
      title="Salin"
    >
      {copied ? (
        <>
          <Check size={12} />
          Tersalin
        </>
      ) : (
        <>
          <Copy size={12} />
          Salin
        </>
      )}
    </button>
  );
}
