"use client";

import * as React from "react";
import { FileText, ImageOff, Loader2 } from "lucide-react";

type Props = {
  assetId: string;
  alt?: string;
  className?: string;
  fallbackUrl?: string | null;
};

type State = "loading" | "ready" | "error";

export function PrivateImage({ assetId, alt = "", className, fallbackUrl }: Props) {
  const [state, setState] = React.useState<State>("loading");
  const src = `/api/media/${assetId}`;

  return (
    <div className={`relative ${className ?? ""}`}>
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {state === "error" && (
        <div className="flex h-full items-center justify-center bg-muted/30 rounded">
          <ImageOff className="size-5 text-muted-foreground/50" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${state !== "ready" ? "opacity-0" : "opacity-100"} h-full w-full object-contain transition-opacity`}
        onLoad={() => setState("ready")}
        onError={() => {
          if (fallbackUrl) {
            setState("ready");
          } else {
            setState("error");
          }
        }}
      />
    </div>
  );
}

export function PrivateImageLink({
  assetId,
  alt = "",
  className,
  fallbackUrl,
}: Props) {
  const src = `/api/media/${assetId}`;

  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="block">
      <PrivateImage assetId={assetId} alt={alt} className={className} fallbackUrl={fallbackUrl} />
      <p className="mt-1 text-xs text-blue-600">Klik untuk buka full size</p>
    </a>
  );
}
