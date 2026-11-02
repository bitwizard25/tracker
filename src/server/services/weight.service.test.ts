import { describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "@/server/errors";
import { createUser } from "@/server/repositories/user.repository";
import { createTestDb } from "@/test/createTestDb";
import { list, logWeight, remove, update } from "./weight.service";

const TODAY = "2026-03-10";

function setup() {
  const db = createTestDb();
  const mk = (email: string) =>
    createUser(db, { email, passwordHash: "h", displayName: "User", goalType: "lose" }).id;
  return { db, a: mk("a@b.co"), b: mk("b@b.co") };
}

describe("weight.service", () => {
  it("logWeight creates then updates, with created flag", () => {
    const { db, a } = setup();
    const first = logWeight(db, a, { entryDate: "2026-03-09", weightKg: 80 }, TODAY);
    expect(first.created).toBe(true);
    const second = logWeight(db, a, { entryDate: "2026-03-09", weightKg: 79 }, TODAY);
    expect(second.created).toBe(false);
    expect(second.entry.weightKg).toBe(79);
    expect(list(db, a)).toHaveLength(1);
  });

  it("accepts today and tomorrow (timezone tolerance) but not the day after", () => {
    const { db, a } = setup();
    expect(() => logWeight(db, a, { entryDate: TODAY, weightKg: 80 }, TODAY)).not.toThrow();
    expect(() => logWeight(db, a, { entryDate: "2026-03-11", weightKg: 80 }, TODAY)).not.toThrow();
    expect(() => logWeight(db, a, { entryDate: "2026-03-12", weightKg: 80 }, TODAY)).toThrow(
      ValidationError,
    );
  });

  it.each([19.99, 500.01])("rejects out-of-range weight %s", (weightKg) => {
    const { db, a } = setup();
    expect(() => logWeight(db, a, { entryDate: TODAY, weightKg }, TODAY)).toThrow(ValidationError);
  });

  it("accepts the range boundaries", () => {
    const { db, a } = setup();
    expect(() => logWeight(db, a, { entryDate: "2026-03-01", weightKg: 20 }, TODAY)).not.toThrow();
    expect(() => logWeight(db, a, { entryDate: "2026-03-02", weightKg: 500 }, TODAY)).not.toThrow();
  });

  it("update changes own entry", () => {
    const { db, a } = setup();
    const { entry } = logWeight(db, a, { entryDate: TODAY, weightKg: 80 }, TODAY);
    expect(update(db, a, entry.id, 75).weightKg).toBe(75);
  });

  it("update rejects out-of-range weight", () => {
    const { db, a } = setup();
    const { entry } = logWeight(db, a, { entryDate: TODAY, weightKg: 80 }, TODAY);
    expect(() => update(db, a, entry.id, 10)).toThrow(ValidationError);
  });

  it("user B cannot update or remove user A's entry", () => {
    const { db, a, b } = setup();
    const { entry } = logWeight(db, a, { entryDate: TODAY, weightKg: 80 }, TODAY);
    expect(() => update(db, b, entry.id, 70)).toThrow(NotFoundError);
    expect(() => remove(db, b, entry.id)).toThrow(NotFoundError);
    expect(list(db, a)[0].weightKg).toBe(80);
  });

  it("remove deletes own entry and then 404s", () => {
    const { db, a } = setup();
    const { entry } = logWeight(db, a, { entryDate: TODAY, weightKg: 80 }, TODAY);
    remove(db, a, entry.id);
    expect(list(db, a)).toEqual([]);
    expect(() => remove(db, a, entry.id)).toThrow(NotFoundError);
  });
});
