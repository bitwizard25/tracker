import { describe, expect, it } from "vitest";
import { compareSync } from "bcryptjs";
import { AppError, ConflictError, NotFoundError } from "@/server/errors";
import { users } from "@/server/db/schema";
import { createTestDb } from "@/test/createTestDb";
import { getUser, login, register } from "./auth.service";

const input = {
  email: "raj@example.com",
  password: "password1",
  displayName: "Raj",
  goalType: "lose" as const,
  goalWeightKg: 70,
};

describe("auth.service", () => {
  it("registers with a cost-10 bcrypt hash and returns no hash", async () => {
    const db = createTestDb();
    const user = await register(db, input);
    expect(user.email).toBe("raj@example.com");
    expect(user).not.toHaveProperty("passwordHash");
    expect(user.shareProgress).toBe(false);
    const row = db.select({ passwordHash: users.passwordHash }).from(users).get();
    expect(row?.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(compareSync("password1", row?.passwordHash ?? "")).toBe(true);
  });

  it("lowercases the email on register", async () => {
    const db = createTestDb();
    const user = await register(db, { ...input, email: "Raj@Example.COM" });
    expect(user.email).toBe("raj@example.com");
  });

  it("rejects a duplicate email regardless of case", async () => {
    const db = createTestDb();
    await register(db, input);
    await expect(register(db, { ...input, email: "RAJ@example.com" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("logs in case-insensitively", async () => {
    const db = createTestDb();
    const created = await register(db, input);
    const user = await login(db, { email: "RAJ@EXAMPLE.COM", password: "password1" });
    expect(user).toEqual(created);
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("gives the same INVALID_CREDENTIALS 401 for wrong password and unknown email", async () => {
    const db = createTestDb();
    await register(db, input);
    const wrong = await login(db, { email: "raj@example.com", password: "nope-nope" }).catch(
      (e: unknown) => e,
    );
    const unknown = await login(db, { email: "x@example.com", password: "password1" }).catch(
      (e: unknown) => e,
    );
    for (const e of [wrong, unknown]) {
      expect(e).toBeInstanceOf(AppError);
      expect(e).toMatchObject({ status: 401, code: "INVALID_CREDENTIALS" });
    }
    expect((wrong as Error).message).toBe((unknown as Error).message);
  });

  it("getUser returns the public user or throws NotFoundError", async () => {
    const db = createTestDb();
    const created = await register(db, input);
    expect(getUser(db, created.id)).toEqual(created);
    expect(() => getUser(db, 999)).toThrow(NotFoundError);
  });
});
