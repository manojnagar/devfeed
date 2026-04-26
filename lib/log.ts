/**
 * @file Structured JSON logger with secret redaction.
 *
 * Emits one JSON line per event to stdout (or stderr for warn/error)
 * for easy ingestion by Vercel + downstream log aggregators. Always
 * redacts common secret-looking values out of message/context fields
 * before printing — no token, password, or API key should ever leak
 * into a log line.
 *
 * Per the workspace `logging-security` rule:
 *   - structured (JSON), stable field names
 *   - sanitized inputs (CR/LF stripped to prevent log injection)
 *   - sensitive fields redacted
 *   - correlation ID per request (callers pass `requestId` in context)
 *
 * Usage:
 *   const log = createLogger({ scope: "ingest" });
 *   log.info("ingest_started", { sourceCount: 47 });
 *   log.error("ingest_failed", { error: err.message });
 */

const REDACT_KEYS = new Set([
  "password",
  "pass",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "set-cookie",
  "service_role_key",
  "anon_key",
]);

const SECRET_VALUE_PATTERNS: RegExp[] = [
  /^sk_(live|test)_[A-Za-z0-9]+$/,
  /^pk_(live|test)_[A-Za-z0-9]+$/,
  /^AKIA[0-9A-Z]{16}$/,
  /^ghp_[A-Za-z0-9]{36}$/,
  /^xox[pbar]-[A-Za-z0-9-]+$/,
  /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
];

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug(event: string, context?: LogContext): void;
  info(event: string, context?: LogContext): void;
  warn(event: string, context?: LogContext): void;
  error(event: string, context?: LogContext): void;
  child(extra: LogContext): Logger;
}

export interface LoggerOptions {
  scope?: string;
  base?: LogContext;
}

/**
 * Sanitize a single primitive value for safe logging.
 *
 * Strips CR/LF (log injection guard) and replaces secret-shaped values
 * with the literal `[REDACTED]`.
 */
export function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    const stripped = value.replace(/[\r\n]+/g, " ").slice(0, 2000);
    for (const pattern of SECRET_VALUE_PATTERNS) {
      if (pattern.test(stripped)) return "[REDACTED]";
    }
    return stripped;
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === "object") {
    return sanitizeContext(value as LogContext);
  }
  return value;
}

/**
 * Walk a context object and redact values whose keys look sensitive.
 */
export function sanitizeContext(ctx: LogContext): LogContext {
  const out: LogContext = {};
  for (const [key, value] of Object.entries(ctx)) {
    if (REDACT_KEYS.has(key.toLowerCase())) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = sanitizeValue(value);
    }
  }
  return out;
}

function emit(level: LogLevel, event: string, context: LogContext): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...sanitizeContext(context),
  });
  if (level === "error" || level === "warn") {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
}

/**
 * Build a logger bound to a scope (e.g. "ingest", "auth", "digest").
 *
 * The returned logger has `child()` so request handlers can derive
 * per-request loggers carrying the correlation id.
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const base: LogContext = { ...(options.base ?? {}) };
  if (options.scope) base.scope = options.scope;

  const log: Logger = {
    debug: (event, context = {}) => emit("debug", event, { ...base, ...context }),
    info: (event, context = {}) => emit("info", event, { ...base, ...context }),
    warn: (event, context = {}) => emit("warn", event, { ...base, ...context }),
    error: (event, context = {}) => emit("error", event, { ...base, ...context }),
    child: (extra) => createLogger({ scope: options.scope, base: { ...base, ...extra } }),
  };
  return log;
}

export const log = createLogger({ scope: "app" });
