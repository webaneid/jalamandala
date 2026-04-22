import * as React from "react";

import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow?: string | null;
  title: string;
  description?: string | null;
  action?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: SectionHeaderProps) {
  const isCentered = align === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        isCentered ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      <div className="space-y-4">
        {eyebrow ? (
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-primary-600">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-foreground sm:text-4xl lg:text-[2.75rem]">{title}</h2>
        {description ? (
          <p
            className={cn(
              "max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg",
              isCentered ? "mx-auto" : ""
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className={cn(isCentered ? "justify-center" : "justify-start")}>{action}</div> : null}
    </div>
  );
}
