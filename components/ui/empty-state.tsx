/**
 * @file Empty-state block — used wherever a list returns zero results.
 */

import * as React from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border border-dashed border-[rgb(var(--color-line-strong))] rounded-lg p-10 text-center",
        className,
      )}
    >
      {icon ? <div className="mx-auto mb-3 text-[rgb(var(--color-fg-muted))]">{icon}</div> : null}
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      {description ? (
        <p className="text-sm text-[rgb(var(--color-fg-muted))] max-w-sm mx-auto">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
