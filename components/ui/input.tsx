/**
 * @file Input + Textarea + Label + Select primitives.
 *
 * Headless form controls themed via design tokens. Each composes only
 * its own state — error styling is controlled by passing `aria-invalid`.
 */

import * as React from "react";
import { cn } from "@/lib/cn";

const FIELD_BASE =
  "w-full bg-[rgb(var(--color-surface-elevated))] text-[rgb(var(--color-fg))] border border-[rgb(var(--color-line-strong))] rounded-md placeholder:text-[rgb(var(--color-fg-subtle))] focus:border-[rgb(var(--color-accent))] focus:ring-2 focus:ring-[rgb(var(--color-accent))]/30 outline-none transition";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...rest }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(FIELD_BASE, "h-10 px-3 text-sm", className)}
      {...rest}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...rest }, ref) => (
  <textarea
    ref={ref}
    className={cn(FIELD_BASE, "min-h-[88px] py-2 px-3 text-sm leading-relaxed", className)}
    {...rest}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...rest }, ref) => (
  <select
    ref={ref}
    className={cn(FIELD_BASE, "h-10 px-3 text-sm pr-8 appearance-none", className)}
    {...rest}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...rest }, ref) => (
  <label
    ref={ref}
    className={cn("block text-sm font-medium text-[rgb(var(--color-fg))] mb-1.5", className)}
    {...rest}
  />
));
Label.displayName = "Label";

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-[rgb(var(--color-danger))]">{children}</p>;
}
