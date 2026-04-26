/**
 * @file In-memory SuggestionRepository implementation.
 *
 * Powers the user-suggest + admin-moderate flows. Pending counts are
 * computed on demand against the in-memory list — fine for dev mode
 * since we never have many suggestions.
 */

import type { PublisherSuggestion, SuggestionStatus } from "../../../types";
import type { SuggestionRepository } from "../../types";
import { getMemoryStore } from "../store";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const memorySuggestionRepo: SuggestionRepository = {
  async listForUser(userId) {
    return Array.from(getMemoryStore().suggestions.values())
      .filter((s) => s.submittedByUserId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async listByStatus(status) {
    return Array.from(getMemoryStore().suggestions.values())
      .filter((s) => s.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getById(id) {
    return getMemoryStore().suggestions.get(id) ?? null;
  },
  async insert(suggestion: PublisherSuggestion) {
    getMemoryStore().suggestions.set(suggestion.id, suggestion);
    return suggestion;
  },
  async countPendingForUser(userId) {
    return Array.from(getMemoryStore().suggestions.values()).filter(
      (s) => s.submittedByUserId === userId && s.status === "pending",
    ).length;
  },
  async countLastWeekForUser(userId) {
    const cutoff = Date.now() - ONE_WEEK_MS;
    return Array.from(getMemoryStore().suggestions.values()).filter(
      (s) =>
        s.submittedByUserId === userId &&
        new Date(s.createdAt).getTime() >= cutoff,
    ).length;
  },
  async decide(suggestionId, decision: SuggestionStatus, reviewerId, reviewerNotes) {
    const store = getMemoryStore();
    const existing = store.suggestions.get(suggestionId);
    if (!existing) throw new Error(`Suggestion ${suggestionId} not found`);
    const updated: PublisherSuggestion = {
      ...existing,
      status: decision,
      reviewedByUserId: reviewerId,
      reviewerNotes,
      updatedAt: new Date().toISOString(),
    };
    store.suggestions.set(suggestionId, updated);
    return updated;
  },
};
