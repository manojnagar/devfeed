/**
 * @file Vitest global setup.
 *
 * Loaded once before any test file runs. Wires `@testing-library/jest-dom`
 * matchers (`toBeInTheDocument`, etc.) into Vitest's `expect` and forces
 * the storage adapter to "memory" so tests never accidentally hit a real
 * Supabase project.
 */

import "@testing-library/jest-dom/vitest";

process.env.STORAGE_ADAPTER = "memory";
process.env.AUTH_ADAPTER = "stub";
process.env.EMAIL_ADAPTER = "console";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
process.env.CRON_SECRET = "test-cron-secret";
process.env.UNSUBSCRIBE_SECRET = "test-unsubscribe-secret";
