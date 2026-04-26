/**
 * @file Access label badge — small visual indicator on PostCards.
 *
 * Free posts intentionally don't render a badge to avoid visual noise.
 */

import { Pill } from "@/components/ui/pill";
import type { AccessLabel } from "@/lib/types";

const COPY: Record<AccessLabel, { label: string; tone: Parameters<typeof Pill>[0]["tone"] }> = {
  free: { label: "Free", tone: "success" },
  paid: { label: "Paid", tone: "warning" },
  members_only: { label: "Members", tone: "accent" },
  mixed: { label: "Mixed", tone: "neutral" },
};

export function AccessBadge({ access }: { access: AccessLabel }) {
  if (access === "free") return null;
  const meta = COPY[access];
  return (
    <Pill tone={meta.tone} size="sm">
      {meta.label}
    </Pill>
  );
}
