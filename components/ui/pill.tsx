/**
 * @file Pill / chip primitive used by tag clouds, filter chips, badges.
 */

import * as React from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "type-company" | "type-person";
type Size = "sm" | "md";

const TONE_CLASSES: Record<Tone, string> = {
  neutral:
    "border-[rgb(var(--color-line-strong))] text-[rgb(var(--color-fg-muted))]",
  accent:
    "border-[rgb(var(--color-accent))] text-[rgb(var(--color-accent))]",
  success:
    "border-[rgb(var(--color-success))] text-[rgb(var(--color-success))]",
  warning:
    "border-[rgb(var(--color-warning))] text-[rgb(var(--color-warning))]",
  danger:
    "border-[rgb(var(--color-danger))] text-[rgb(var(--color-danger))]",
  "type-company":
    "border-[rgb(var(--color-type-company))] text-[rgb(var(--color-type-company))]",
  "type-person":
    "border-[rgb(var(--color-type-person))] text-[rgb(var(--color-type-person))]",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-6 px-2 text-xs",
  md: "h-7 px-3 text-sm",
};

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: Size;
  active?: boolean;
}

export const Pill = React.forwardRef<HTMLSpanElement, PillProps>(
  ({ tone = "neutral", size = "sm", active, className, ...rest }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-transparent font-medium",
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        active && "bg-[rgb(var(--color-accent))]/10",
        className,
      )}
      {...rest}
    />
  ),
);
Pill.displayName = "Pill";
