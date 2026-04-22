import * as React from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FormSectionCardProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function FormSectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: FormSectionCardProps) {
  return (
    <Card
      className={cn(
        "rounded-[1.75rem] border border-border/80 bg-white/92 py-0 shadow-[0_22px_60px_rgba(15,23,42,0.08)] ring-0",
        className
      )}
    >
      {title || description || action ? (
        <CardHeader className="border-b border-border/70 px-6 py-5">
          {title ? <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle> : null}
          {description ? <CardDescription className="text-sm leading-6">{description}</CardDescription> : null}
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn("px-6 py-6", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
