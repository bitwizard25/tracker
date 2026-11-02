import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { createUser } from "@/server/repositories/user.repository";
import { SESSION_COOKIE, signSession } from "@/server/session";
import { createTestDb } from "@/test/createTestDb";
import { compose } from "./compose";
import { withAuth } from "./withAuth";
import { withErrorHandler } from "./withErrorHandler";

const SECRET = "s".repeat(32);

function setup(db: Db) {
  return compose(withErrorHandler, withAuth({ db }))(async (ctx) => Response.json({ user: ctx.user }));
}

function request(token?: string): NextRequest {
  return new NextRequest("http://localhost/api/auth/me", {
    headers: token === undefined ? {} : { cookie: `${SESSION_COOKIE}=${token}` },
  });
}

const params = { params: Promise.resolve({}) };

describe("withAuth", () => {
  let db: Db;
  let userId: number;

  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    db = createTestDb();
    userId = createUser(db, {
      email: "a@b.co",
      passwordHash: "hash",
      displayName: "Alice",
      goalType: "lose",
    }).id;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  async function expectUnauthorized(res: Response) {
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    });
  }

  it("injects the session user into the context", async () => {
    const res = await setup(db)(request(await signSession(userId)), params);
    expect(res.status).toBe(200);
    const { user } = await res.json();
    expect(user).toMatchObject({ id: userId, email: "a@b.co", displayName: "Alice" });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("rejects a missing cookie", async () => {
    await expectUnauthorized(await setup(db)(request(), params));
  });

  it("rejects a garbage token", async () => {
    await expectUnauthorized(await setup(db)(request("garbage"), params));
  });

  it("rejects a tampered token", async () => {
    const [h, , s] = (await signSession(userId)).split(".");
    const payload = Buffer.from(JSON.stringify({ sub: "999", exp: 9999999999 })).toString("base64url");
    await expectUnauthorized(await setup(db)(request(`${h}.${payload}.${s}`), params));
  });

  it("rejects a token signed with another secret", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(String(userId))
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode("x".repeat(32)));
    await expectUnauthorized(await setup(db)(request(token), params));
  });

  it("rejects an expired token", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = await signSession(userId);
    vi.setSystemTime(new Date("2026-01-09T00:00:00Z"));
    await expectUnauthorized(await setup(db)(request(token), params));
  });

  it("rejects a valid token for a deleted user", async () => {
    const token = await signSession(userId);
    db.delete(users).run();
    await expectUnauthorized(await setup(db)(request(token), params));
  });
});
