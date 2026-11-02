import type { Db } from "@/server/db/client";
import { createUser, setSharing } from "@/server/repositories/user.repository";
import { upsertEntry } from "@/server/repositories/weight.repository";

export type Seed = {
  name: string;
  goalType?: "lose" | "gain";
  share?: boolean;
  entries?: [date: string, weightKg: number][];
};

export function seedUser(db: Db, seed: Seed): number {
  const user = createUser(db, {
    email: `${seed.name.toLowerCase()}@example.com`,
    passwordHash: "hash",
    displayName: seed.name,
    goalType: seed.goalType ?? "lose",
  });
  if (seed.share) setSharing(db, user.id, true);
  for (const [date, weightKg] of seed.entries ?? []) upsertEntry(db, user.id, date, weightKg);
  return user.id;
}

/** Recursively collects every object key in a JSON-like value. */
export function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
  } else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}
