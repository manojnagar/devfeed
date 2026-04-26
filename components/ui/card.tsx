/**
 * @file Card surface — used for posts, publishers, settings sections.
 */

import * as React from "react";
import { cn } from "@/lib/cn";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-[rgb(var(--color-surface-elevated))] border border-[rgb(var(--color-line))] rounded-lg",
        className,
      )}
      {...rest}
    />
  ),
);
Card.displayName = "Card";

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4 border-b border-[rgb(var(--color-line))]", className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold", className)} {...rest} />;
}

export function CardBody({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-5 py-3 border-t border-[rgb(var(--color-line))] bg-[rgb(var(--color-surface))] rounded-b-lg",
        className,
      )}
      {...rest}
    />
  );
}
