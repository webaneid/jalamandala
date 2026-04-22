import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type AdminPageHeaderProps = {
  title: string
  description: string
  eyebrow?: string
  badge?: string
  align?: "default" | "centered"
  actions?: React.ReactNode
}

export function AdminPageHeader({
  title,
  description,
  eyebrow,
  badge,
  align = "default",
  actions,
}: AdminPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-[28px] border border-border/80 bg-card px-6 py-6 shadow-[0_24px_80px_rgba(16,24,40,0.09)] backdrop-blur-xl xl:px-8 xl:py-8",
        align === "centered" && "items-center text-center"
      )}
    >
      <div className="space-y-3">
        {(eyebrow || badge) && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              align === "centered" && "justify-center"
            )}
          >
            {eyebrow ? (
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                {eyebrow}
              </span>
            ) : null}
            {badge ? (
              <Badge className="bg-foreground/6 text-muted-foreground ring-0">
                {badge}
              </Badge>
            ) : null}
          </div>
        )}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-[-0.05em] text-foreground md:text-5xl">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
            {description}
          </p>
        </div>
      </div>

      {actions ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3",
            align === "centered" && "justify-center"
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  )
}
