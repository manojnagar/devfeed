/**
 * @file In-memory DigestRepository implementation.
 */

import type { DigestPreferences } from "../../../types";
import type { DigestRepository } from "../../types";
import { getMemoryStore } from "../store";

const DEFAULT_PREFS: Omit<DigestPreferences, "userId"> = {
  frequency: "weekly",
  preferredHourUtc: 13,
  includeFollowedPublishers: true,
  includeFollowedTags: true,
  includeAccessLabels: ["free", "paid", "members_only", "mixed"],
  maxPostsPerEmail: 12,
  lastSentAt: null,
};

export const memoryDigestRepo: DigestRepository = {
  async getPreferences(userId) {
    const store = getMemoryStore();
    const existing = store.digestPreferences.get(userId);
    if (existing) return existing;
    const fresh: DigestPreferences = { userId, ...DEFAULT_PREFS };
    store.digestPreferences.set(userId, fresh);
    return fresh;
  },
  async setPreferences(prefs) {
    getMemoryStore().digestPreferences.set(prefs.userId, prefs);
    return prefs;
  },
  async selectRecipients(now: Date) {
    const store = getMemoryStore();
    const hour = now.getUTCHours();
    const out: DigestPreferences[] = [];
    for (const prefs of store.digestPreferences.values()) {
      if (prefs.frequency === "off") continue;
      if (prefs.preferredHourUtc !== hour) continue;
      if (prefs.frequency === "daily") {
        out.push(prefs);
      } else if (prefs.frequency === "weekly") {
        if (now.getUTCDay() === 1) out.push(prefs);
      }
    }
    return out;
  },
  async recordSent(userId, sentAt, _postIds) {
    const store = getMemoryStore();
    const existing = store.digestPreferences.get(userId);
    if (existing) {
      store.digestPreferences.set(userId, { ...existing, lastSentAt: sentAt });
    }
  },
};
