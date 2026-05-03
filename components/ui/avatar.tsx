/**
 * @file Avatar / publisher logo with initials fallback.
 *
 * Render strategy
 * ---------------
 * The Avatar walks an *ordered list* of candidate image URLs (passed
 * via `src`) and falls back to colored initials when the list is
 * exhausted. The visual layering is three layers, painted bottom → top:
 *
 *   1. Outer tile: a clipped rounded box on the page-surface color
 *      (`--color-surface`) with a hairline `--color-line` border. This
 *      surface is intentionally *slightly darker* than the card it
 *      sits on (`--color-surface-elevated`) so transparent or
 *      placeholder favicons still leave a visible avatar shape.
 *   2. Colored "initials" layer: an absolutely-positioned inner span
 *      with `colorForName(name)` and the publisher's initials. It
 *      starts at `opacity-100` and fades to `opacity-0` once a
 *      candidate has confirmed a successful, non-degenerate load.
 *   3. Favicon image: also absolute, `object-contain` with a 2px pad.
 *      Starts at `opacity-0` and fades in once `onLoad` reports a real
 *      image whose decoded size clears the per-URL threshold below.
 *
 * Candidate progression
 * ---------------------
 * On `onError` (network/404/MIME) or on a sub-threshold decoded size,
 * the Avatar advances to the next candidate. The threshold is
 * URL-aware:
 *
 *   - `…/favicon.ico`: must decode at >= 24×24. Catches the 1×1
 *     transparent placeholder some servers send instead of a 404 *and*
 *     the 16×16 default favicons that hosted blog platforms (Tumblr,
 *     Substack, etc.) often serve. A real 16×16 favicon is too small
 *     to render cleanly at the avatar size anyway.
 *   - Everything else (apple-touch-icon, admin-supplied URL): >= 16×16.
 *
 * Net behaviour
 * -------------
 *   - During load (or never-loads): user sees the colored initials.
 *   - On successful load of a candidate: initials fade out, favicon
 *     fades in. Any transparent padding inside the favicon now sits on
 *     a clean neutral surface, so logos like Atlassian's blue mark on
 *     transparent don't bleed through to the colored initials.
 *   - All candidates fail: initials remain, no broken-image glyph.
 *
 * Avatar is a leaf component, so the `"use client"` directive only
 * costs one extra hydration boundary per render site.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface AvatarProps {
  /**
   * Candidate logo URLs to try in order. May be a single URL string
   * (legacy callers), a list, `null`, or `undefined`. The Avatar walks
   * the list, falling back to colored initials only when every
   * candidate has errored or decoded too small.
   */
  src?: string | readonly string[] | null;
  name: string;
  size?: number;
  rounded?: "full" | "md";
  className?: string;
}

/** Decoded-pixel thresholds — see file-level docstring for rationale. */
const MIN_SIZE_FAVICON_ICO = 24;
const MIN_SIZE_OTHER = 16;

function minSizeFor(url: string): number {
  // Match `/favicon.ico`, allowing optional ?query / #fragment.
  return /\/favicon\.ico(?:[?#].*)?$/i.test(url)
    ? MIN_SIZE_FAVICON_ICO
    : MIN_SIZE_OTHER;
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

function normalizeSrc(src: AvatarProps["src"]): string[] {
  if (!src) return [];
  if (typeof src === "string") return src ? [src] : [];
  return src.filter((u): u is string => typeof u === "string" && u.length > 0);
}

export function Avatar({ src, name, size = 32, rounded = "md", className }: AvatarProps) {
  const radius = rounded === "full" ? "rounded-full" : "rounded-md";

  // Snapshot to a stable string so React re-runs effects only when the
  // *content* of the candidate list actually changes (parents typically
  // build a fresh array each render).
  const candidates = normalizeSrc(src);
  const candidatesKey = candidates.join("|");

  const [index, setIndex] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [candidatesKey]);

  const currentSrc = candidates[index];
  const exhausted = !currentSrc;

  // Scale the initials font with the tile so 16-px and 80-px tiles
  // both look balanced.
  const initialsFontSize = Math.max(10, Math.round(size * 0.4));

  return (
    <span
      role="img"
      aria-label={name}
      style={{
        width: size,
        height: size,
        fontSize: initialsFontSize,
      }}
      className={cn(
        "relative inline-block shrink-0 overflow-hidden border border-[rgb(var(--color-line))] bg-[rgb(var(--color-surface))]",
        radius,
        className,
      )}
    >
      <span
        aria-hidden="true"
        style={{ background: colorForName(name) }}
        className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold text-white select-none transition-opacity duration-150",
          loaded ? "opacity-0" : "opacity-100",
        )}
      >
        {initials(name)}
      </span>
      {!exhausted ? (
        <img
          // Keying by URL forces a fresh element per candidate so the
          // browser actually fires `load`/`error` for each attempt
          // rather than keeping the previous image's decode state.
          key={currentSrc}
          src={currentSrc}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => {
            setLoaded(false);
            setIndex((i) => i + 1);
          }}
          onLoad={(event) => {
            const img = event.currentTarget;
            const min = minSizeFor(currentSrc);
            if (img.naturalWidth < min || img.naturalHeight < min) {
              setLoaded(false);
              setIndex((i) => i + 1);
              return;
            }
            setLoaded(true);
          }}
          className={cn(
            "absolute inset-0 h-full w-full object-contain p-0.5 transition-opacity duration-150",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}
    </span>
  );
}
