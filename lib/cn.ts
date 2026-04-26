/**
 * @file Tailwind class-name utility.
 *
 * Combines `clsx` (for conditional class merging) with `tailwind-merge`
 * (for resolving conflicting Tailwind utilities — last-write-wins per
 * Tailwind property group). This is the single helper every component
 * uses for `className` composition.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge any number of class-name inputs and dedupe Tailwind conflicts.
 *
 * @param inputs - Strings, arrays, or objects accepted by `clsx`.
 * @returns A single class-name string safe to pass to `className`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
