/**
 * @file Environment variable loader + validator.
 *
 * Single source of truth for which storage / auth / email adapters to
 * instantiate at boot. Validates the values once and exposes a typed
 * `env` object so the rest of the codebase never reaches into
 * `process.env` directly.
 *
 * NEVER store credentials in code — secrets must come from the host
 * (Vercel env vars, .env.local). This module only validates that the
 * required ones are present and well-formed for the chosen adapters.
 */

import { z } from "zod";

const RawEnvSchema = z
  .object({
    STORAGE_ADAPTER: z.enum(["memory", "supabase"]).default("memory"),
    AUTH_ADAPTER: z.enum(["stub", "supabase"]).default("stub"),
    EMAIL_ADAPTER: z.enum(["console", "resend"]).default("console"),

    NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
    CRON_SECRET: z.string().min(1).default("dev-cron-secret"),
    UNSUBSCRIBE_SECRET: z.string().min(1).default("dev-unsubscribe-secret"),

    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM: z.string().optional(),

    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  })
  .superRefine((data, ctx) => {
    if (data.STORAGE_ADAPTER === "supabase" || data.AUTH_ADAPTER === "supabase") {
      if (!data.NEXT_PUBLIC_SUPABASE_URL || !data.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required when STORAGE_ADAPTER or AUTH_ADAPTER is 'supabase'.",
          path: ["NEXT_PUBLIC_SUPABASE_URL"],
        });
      }
    }
    if (data.EMAIL_ADAPTER === "resend" && !data.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RESEND_API_KEY is required when EMAIL_ADAPTER is 'resend'.",
        path: ["RESEND_API_KEY"],
      });
    }
  });

export type Env = z.infer<typeof RawEnvSchema>;

let cached: Env | null = null;

/**
 * Parse the environment once and memoize it.
 *
 * Throws on misconfiguration so the process fails loudly at boot rather
 * than at the first request.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = RawEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      "Invalid environment configuration:\n" +
        parsed.error.errors.map((e) => `  - ${e.path.join(".")}: ${e.message}`).join("\n"),
    );
  }
  cached = parsed.data;
  return cached;
}

/**
 * Reset the cached env. Test-only — production code never calls this.
 */
export function resetEnvCache(): void {
  cached = null;
}
