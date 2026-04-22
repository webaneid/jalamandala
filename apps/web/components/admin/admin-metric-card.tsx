import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AdminMetricCardProps = {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  trend?: "up" | "down" | "neutral"
  trendLabel?: string
}

export function AdminMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  trend = "neutral",
  trendLabel,
}: AdminMetricCardProps) {
  const trendClassName =
    trend === "up"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : trend === "down"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-primary-50 text-primary-700 ring-primary-100"

  return (
    <Card className="border border-border/80 bg-card shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                {value}
              </p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
          </div>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
        </div>

        {trendLabel ? (
          <div className="mt-5 flex items-center gap-2">
            <Badge
              className={cn(
                "gap-1 ring-1 ring-inset",
                trendClassName
              )}
            >
              {trend === "up" ? <TrendingUp className="size-3" /> : null}
              {trend === "down" ? <TrendingDown className="size-3" /> : null}
              {trendLabel}
            </Badge>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
