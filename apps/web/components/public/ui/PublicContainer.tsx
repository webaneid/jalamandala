import * as React from "react";

import { cn } from "@/lib/utils";

type PublicContainerProps = React.ComponentProps<"div"> & {
  size?: "sm" | "md" | "lg" | "xl";
  asChild?: false;
};

export function PublicContainer({
  className,
  size: _size,
  ...props
}: PublicContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[720px] px-5", className)}
      {...props}
    />
  );
}
