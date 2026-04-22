"use client";

import * as React from "react";
import { ImageIcon, ImageOff, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  assetId: string | null;
  label?: string;
};

export function PaymentProofPreviewButton({ assetId, label = "Bukti transfer" }: Props) {
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");

  React.useEffect(() => {
    if (open) {
      setState("loading");
    }
  }, [open, assetId]);

  if (!assetId) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const src = `/api/media/${assetId}`;

  return (
    <>
      <Button
        className="h-8 gap-1.5 rounded-xl px-2.5 text-xs"
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="outline"
      >
        <ImageIcon className="size-3.5" />
        Lihat
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">Klik area luar untuk menutup.</p>
              </div>
              <button
                className="inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted/70"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative flex min-h-[320px] flex-1 items-center justify-center bg-slate-50 p-4">
              {state === "loading" ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : null}

              {state === "error" ? (
                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                  <ImageOff className="size-8 opacity-50" />
                  Bukti transfer tidak bisa dimuat.
                </div>
              ) : (
                <img
                  alt={label}
                  className={`max-h-[70vh] max-w-full rounded-xl object-contain transition-opacity ${
                    state === "ready" ? "opacity-100" : "opacity-0"
                  }`}
                  onError={() => setState("error")}
                  onLoad={() => setState("ready")}
                  src={src}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
