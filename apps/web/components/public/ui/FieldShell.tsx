import * as React from "react";

import { cn } from "@/lib/utils";

type FieldShellProps = {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
};

export function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  className,
  labelClassName,
  children,
}: FieldShellProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label
          htmlFor={id}
          className={cn("block text-sm font-medium text-foreground", labelClassName)}
        >
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
