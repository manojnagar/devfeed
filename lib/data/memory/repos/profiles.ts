/**
 * @file In-memory ProfileRepository implementation.
 */

import type { Profile, UserRole } from "../../../types";
import type { ProfileRepository } from "../../types";
import { getMemoryStore } from "../store";

export const memoryProfileRepo: ProfileRepository = {
  async getById(userId) {
    return getMemoryStore().profiles.get(userId) ?? null;
  },
  async upsert(profile: Profile) {
    getMemoryStore().profiles.set(profile.userId, profile);
    return profile;
  },
  async setRole(userId: string, role: UserRole) {
    const store = getMemoryStore();
    const existing = store.profiles.get(userId);
    if (existing) store.profiles.set(userId, { ...existing, role });
  },
  async setBanned(userId, isBanned) {
    const store = getMemoryStore();
    const existing = store.profiles.get(userId);
    if (existing) store.profiles.set(userId, { ...existing, isBanned });
  },
  async list({ role } = {}) {
    return Array.from(getMemoryStore().profiles.values()).filter(
      (p) => (role ? p.role === role : true),
    );
  },
};
