import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "brand";

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
};

const toneClassMap: Record<StatusBadgeTone, string> = {
  neutral: "border-border bg-muted text-foreground",
  info: "border-accent-100 bg-accent-50 text-accent-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  brand: "border-primary-100 bg-primary-50 text-primary-900",
};

export function StatusBadge({ children, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("h-6 rounded-full px-2.5 text-[0.7rem] font-semibold tracking-[0.08em] uppercase", toneClassMap[tone], className)}
    >
      {children}
    </Badge>
  );
}
