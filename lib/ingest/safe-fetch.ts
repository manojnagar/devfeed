/**
 * @file SSRF-safe fetch wrapper.
 *
 * Per the workspace data-and-storage-security + mcp-security-guidelines
 * rules, every request to a user-supplied URL must be validated to
 * prevent server-side request forgery: the protocol must be http(s),
 * the resolved host must not be private/loopback/link-local, and the
 * response size + total time must be bounded.
 */

import { isPrivateHost } from "../url";
import { log } from "../log";

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  method?: "GET" | "HEAD";
}

export interface SafeFetchResult {
  status: number;
  body: string;
  headers: Headers;
  finalUrl: string;
}

const DEFAULT_TIMEOUT = 8_000;
const DEFAULT_MAX_BYTES = 4 * 1024 * 1024;

/**
 * Throws a typed error for any URL that fails the safety checks before
 * an outbound request is made.
 */
export class UnsafeUrlError extends Error {
  constructor(
    message: string,
    public readonly reason: "scheme" | "host" | "parse",
  ) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

function assertSafeUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UnsafeUrlError(`Could not parse URL: ${url}`, "parse");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError(`Unsupported scheme: ${parsed.protocol}`, "scheme");
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new UnsafeUrlError(`Private host blocked: ${parsed.hostname}`, "host");
  }
  return parsed;
}

/**
 * Fetch a URL with SSRF + size + time guards.
 *
 * @param url     Outbound URL — must be http(s), public host.
 * @param options Optional timeout / max-byte / header overrides.
 * @returns       Body (as text), status, headers, and the post-redirect URL.
 */
export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const parsed = assertSafeUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT);

  try {
    const res = await fetch(parsed.toString(), {
      method: options.method ?? "GET",
      headers: {
        "user-agent": "DevFeedIngest/1.0 (+https://devfeed.example/about)",
        accept:
          "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, text/html;q=0.5, */*;q=0.1",
        ...options.headers,
      },
      signal: controller.signal,
      redirect: "follow",
    });
    const finalUrl = res.url || parsed.toString();
    if (!res.body) {
      return { status: res.status, body: "", headers: res.headers, finalUrl };
    }
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    const max = options.maxBytes ?? DEFAULT_MAX_BYTES;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        log.warn("safe_fetch_truncated", { url, max });
        await reader.cancel().catch(() => undefined);
        break;
      }
      chunks.push(value);
    }
    const body = new TextDecoder().decode(concatChunks(chunks, total));
    return { status: res.status, body, headers: res.headers, finalUrl };
  } finally {
    clearTimeout(timeout);
  }
}

function concatChunks(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk.subarray(0, Math.min(chunk.byteLength, totalLength - offset)), offset);
    offset += chunk.byteLength;
    if (offset >= totalLength) break;
  }
  return out;
}
