import * as React from "react";

import { cn } from "@/lib/utils";

type PublicContainerProps = React.ComponentProps<"div"> & {
  size?: "sm" | "md" | "lg" | "xl";
  asChild?: false;
};

const sizeClassMap: Record<NonNullable<PublicContainerProps["size"]>, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-7xl",
};

export function PublicContainer({
  className,
  size = "lg",
  ...props
}: PublicContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full px-6 lg:px-8", sizeClassMap[size], className)}
      {...props}
    />
  );
}
