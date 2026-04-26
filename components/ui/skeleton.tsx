/**
 * @file Animated loading skeleton block.
 */

import * as React from "react";
import { cn } from "@/lib/cn";

export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-pulse rounded-md bg-[rgb(var(--color-line))]",
        className,
      )}
      {...rest}
    />
  );
}
