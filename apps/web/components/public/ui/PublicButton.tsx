import * as React from "react";
import { cva } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const publicButtonVariants = cva("", {
  variants: {
    tone: {
      primary: "",
      secondary: "",
      outline: "",
      ghost: "",
      destructive: "",
    },
    emphasis: {
      default: "",
      hero: "shadow-[0_18px_40px_rgba(19,67,151,0.18)]",
    },
    fullWidth: {
      true: "w-full",
      false: "",
    },
  },
  defaultVariants: {
    tone: "primary",
    emphasis: "default",
    fullWidth: false,
  },
});

type PublicButtonTone = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "xs" | "sm" | "default" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

function resolveBaseVariant(tone: PublicButtonTone): ButtonVariant {
  switch (tone) {
    case "secondary":
      return "secondary";
    case "outline":
      return "outline";
    case "ghost":
      return "ghost";
    case "destructive":
      return "destructive";
    case "primary":
    default:
      return "default";
  }
}

export type PublicButtonProps = React.ComponentProps<typeof Button> &
  {
    tone?: PublicButtonTone;
    emphasis?: "default" | "hero";
    fullWidth?: boolean;
    size?: ButtonSize;
  };

export function getPublicButtonClassName({
  className,
  tone = "primary",
  emphasis = "default",
  fullWidth = false,
}: Pick<PublicButtonProps, "className" | "tone" | "emphasis" | "fullWidth">) {
  return cn(
    "inline-flex items-center justify-center rounded-2xl font-semibold",
    tone === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
    tone === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    tone === "outline" && "border border-border bg-white text-foreground hover:bg-muted",
    tone === "ghost" && "text-foreground hover:bg-muted",
    tone === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    publicButtonVariants({ tone, emphasis, fullWidth }),
    className
  );
}

export function PublicButton({
  className,
  tone = "primary",
  emphasis = "default",
  fullWidth = false,
  size = "lg",
  ...props
}: PublicButtonProps) {
  return (
    <Button
      variant={resolveBaseVariant(tone)}
      size={size}
      className={getPublicButtonClassName({ tone, emphasis, fullWidth, className })}
      {...props}
    />
  );
}
