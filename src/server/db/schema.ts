import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    goalType: text("goal_type", { enum: ["lose", "gain"] }).notNull(),
    goalWeightKg: real("goal_weight_kg"),
    shareProgress: integer("share_progress", { mode: "boolean" })
      .notNull()
      .default(false),
    shareConsentedAt: text("share_consented_at"),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  },
  (t) => [
    check("users_goal_type_check", sql`${t.goalType} IN ('lose', 'gain')`),
  ],
);

export const weightEntries = sqliteTable(
  "weight_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryDate: text("entry_date").notNull(),
    weightKg: real("weight_kg").notNull(),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  },
  (t) => [
    unique("weight_entries_user_date_unique").on(t.userId, t.entryDate),
    index("weight_entries_user_date_idx").on(t.userId, t.entryDate),
  ],
);
