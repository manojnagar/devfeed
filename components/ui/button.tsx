/**
 * @file Button primitive.
 *
 * Small, dependency-light replacement for shadcn Button. Variants map
 * to design tokens declared in `app/globals.css`. Accessible by default
 * (focus ring, disabled state, type=button to prevent form auto-submit).
 */

import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-[rgb(var(--color-accent))] text-[rgb(var(--color-on-accent))] hover:bg-[rgb(var(--color-accent-hover))]",
  secondary:
    "bg-[rgb(var(--color-surface-elevated))] text-[rgb(var(--color-fg))] border border-[rgb(var(--color-line-strong))] hover:bg-[rgb(var(--color-surface))]",
  ghost:
    "bg-transparent text-[rgb(var(--color-fg))] hover:bg-[rgb(var(--color-surface))]",
  danger:
    "bg-[rgb(var(--color-danger))] text-white hover:opacity-90",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-md",
  md: "h-10 px-4 text-sm rounded-md",
  lg: "h-12 px-6 text-base rounded-md",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Returns the same Tailwind class string used by the `Button` primitive.
 * Use this when rendering button-styled content on a non-button element
 * (e.g. a Next.js `Link`) so the accent / on-accent colors stay in lockstep
 * with the design tokens and survive future refactors.
 */
export function buttonClassName(opts?: {
  variant?: Variant;
  size?: Size;
  className?: string;
}): string {
  const variant = opts?.variant ?? "primary";
  const size = opts?.size ?? "md";
  return cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], opts?.className);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, children, type, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        disabled={rest.disabled || loading}
        className={buttonClassName({ variant, size, className })}
        {...rest}
      >
        {loading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
