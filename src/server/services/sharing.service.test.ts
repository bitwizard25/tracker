import { describe, expect, it } from "vitest";
import { NotFoundError } from "@/server/errors";
import { createTestDb } from "@/test/createTestDb";
import { seedUser } from "@/test/socialFixtures";
import { setSharing } from "./sharing.service";

describe("sharing.service.setSharing", () => {
  it("toggles shareProgress and returns the updated user", () => {
    const db = createTestDb();
    const id = seedUser(db, { name: "Ann" });
    expect(setSharing(db, id, true).shareProgress).toBe(true);
    expect(setSharing(db, id, false).shareProgress).toBe(false);
  });

  it("throws NotFoundError for an unknown user", () => {
    expect(() => setSharing(createTestDb(), 999, true)).toThrow(NotFoundError);
  });
});
