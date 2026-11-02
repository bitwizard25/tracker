import { inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { addDays, todayUtc } from "../../lib/date";
import type { Db } from "./client";
import { users } from "./schema";
import { createUser, setSharing } from "../repositories/user.repository";
import { upsertEntry } from "../repositories/weight.repository";

const PASSWORD = "password123";
const BCRYPT_COST = 10;
const DAYS = 30;

type Demo = {
  name: string;
  goalType: "lose" | "gain";
  startKg: number;
  goalKg: number;
  /** Total kg moved toward the goal over the period (negative = drifted the wrong way). */
  changeKg: number;
  /** Chance of skipping a day. */
  missRate: number;
  shares: boolean;
};

export const DEMOS: Demo[] = [
  {
    name: "Asha",
    goalType: "lose",
    startKg: 82,
    goalKg: 74,
    changeKg: 5.5,
    missRate: 0.05,
    shares: true,
  },
  {
    name: "Ben",
    goalType: "gain",
    startKg: 66,
    goalKg: 72,
    changeKg: 3.2,
    missRate: 0.2,
    shares: true,
  },
  {
    name: "Chloe",
    goalType: "lose",
    startKg: 70,
    goalKg: 63,
    changeKg: 2.1,
    missRate: 0.1,
    shares: true,
  },
  {
    name: "Dev",
    goalType: "lose",
    startKg: 95,
    goalKg: 85,
    changeKg: 7.4,
    missRate: 0.3,
    shares: true,
  },
  {
    name: "Elena",
    goalType: "gain",
    startKg: 55,
    goalKg: 60,
    changeKg: 1.4,
    missRate: 0.0,
    shares: true,
  },
  {
    name: "Farid",
    goalType: "lose",
    startKg: 88,
    goalKg: 80,
    changeKg: -0.8,
    missRate: 0.15,
    shares: true,
  },
  {
    name: "Grace",
    goalType: "lose",
    startKg: 64,
    goalKg: 58,
    changeKg: 3.0,
    missRate: 0.1,
    shares: false,
  },
  {
    name: "Hiro",
    goalType: "gain",
    startKg: 72,
    goalKg: 78,
    changeKg: 4.0,
    missRate: 0.25,
    shares: false,
  },
];

/** mulberry32: small deterministic PRNG so every run produces the same data. */
function createRng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function emailFor(index: number): string {
  return `demo${index + 1}@example.com`;
}

function seedUser(
  db: Db,
  demo: Demo,
  index: number,
  passwordHash: string,
  today: string,
): number {
  const user = createUser(db, {
    email: emailFor(index),
    passwordHash,
    displayName: demo.name,
    goalType: demo.goalType,
    goalWeightKg: demo.goalKg,
  });
  if (demo.shares) setSharing(db, user.id, true);

  const rng = createRng(index + 1);
  const direction = demo.goalType === "lose" ? -1 : 1;
  let entries = 0;
  for (let day = 0; day < DAYS; day++) {
    if (day > 0 && day < DAYS - 1 && rng() < demo.missRate) continue;
    const trend = (demo.changeKg * direction * day) / (DAYS - 1);
    const noise = (rng() - 0.5) * 0.8;
    const weightKg = Math.round((demo.startKg + trend + noise) * 10) / 10;
    upsertEntry(db, user.id, addDays(today, day - (DAYS - 1)), weightKg);
    entries++;
  }
  console.log(
    `  ${emailFor(index)} ${demo.name.padEnd(6)} ${demo.shares ? "sharing" : "private"} ${entries} entries`,
  );
  return entries;
}

export function demoEmails(): string[] {
  return DEMOS.map((_, i) => emailFor(i));
}

/** True when at least one demo account already exists. */
export function demoUsersExist(db: Db): boolean {
  return (
    db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.email, demoEmails()))
      .limit(1)
      .all().length > 0
  );
}

/** Removes only the demo accounts (entries go with them via ON DELETE CASCADE) and recreates them. */
export function replaceDemoUsers(db: Db): void {
  db.delete(users).where(inArray(users.email, demoEmails())).run();

  const passwordHash = bcrypt.hashSync(PASSWORD, BCRYPT_COST);
  const today = todayUtc();
  console.log(`Seeding ${DEMOS.length} demo users (password "${PASSWORD}")`);
  DEMOS.forEach((demo, i) => seedUser(db, demo, i, passwordHash, today));
}

/**
 * Demo accounts share a well-known password, so by default they are only seeded outside production.
 * SEED_DEMO_DATA=true forces seeding, SEED_DEMO_DATA=false disables it.
 */
export function shouldSeedDemo(
  env: Record<string, string | undefined>,
): boolean {
  if (env.SEED_DEMO_DATA === "true") return true;
  if (env.SEED_DEMO_DATA === "false") return false;
  return env.NODE_ENV !== "production";
}
