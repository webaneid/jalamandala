import { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

type AdminEmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: AdminEmptyStateProps) {
  return (
    <Card className="border border-dashed border-border/90 bg-card shadow-none">
      <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-[-0.04em] text-foreground">
            {title}
          </h2>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}
