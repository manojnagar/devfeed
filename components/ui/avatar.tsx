/**
 * @file Avatar / publisher logo with initials fallback.
 */

import * as React from "react";
import { cn } from "@/lib/cn";

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  rounded?: "full" | "md";
  className?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 40%, 60%)`;
}

export function Avatar({ src, name, size = 32, rounded = "md", className }: AvatarProps) {
  const radius = rounded === "full" ? "rounded-full" : "rounded-md";
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn(`object-cover ${radius}`, className)}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      style={{ width: size, height: size, background: colorForName(name) }}
      className={cn(
        `inline-flex items-center justify-center text-white font-semibold ${radius} text-xs`,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
