import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifySession,
} from "./session";

const SECRET = "s".repeat(32);

function signWith(secret: string, subject: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));
}

describe("session", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("round-trips a user id", async () => {
    const token = await signSession(42);
    expect(await verifySession(token)).toBe(42);
  });

  it("returns null for a tampered token", async () => {
    const token = await signSession(42);
    const [header, payload, signature] = token.split(".");
    const flipped = signature.startsWith("A") ? `B${signature.slice(1)}` : `A${signature.slice(1)}`;
    expect(await verifySession(`${header}.${payload}.${flipped}`)).toBeNull();
  });

  it("returns null for a tampered payload", async () => {
    const token = await signSession(42);
    const [header, , signature] = token.split(".");
    const payload = Buffer.from(JSON.stringify({ sub: "1", exp: 9999999999 })).toString("base64url");
    expect(await verifySession(`${header}.${payload}.${signature}`)).toBeNull();
  });

  it("returns null for garbage", async () => {
    expect(await verifySession("not-a-jwt")).toBeNull();
  });

  it("returns null for a token signed with another secret", async () => {
    expect(await verifySession(await signWith("x".repeat(32), "1"))).toBeNull();
  });

  it("returns null once expired", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = await signSession(7);
    vi.setSystemTime(new Date("2026-01-08T00:00:01Z"));
    expect(await verifySession(token)).toBeNull();
  });

  it("is still valid just before expiry", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = await signSession(7);
    vi.setSystemTime(new Date("2026-01-07T23:59:00Z"));
    expect(await verifySession(token)).toBe(7);
  });

  it.each(["abc", "0", "-3", "1.5"])("returns null for subject %s", async (subject) => {
    expect(await verifySession(await signWith(SECRET, subject))).toBeNull();
  });

  it.each(["", "short", "x".repeat(31)])("throws when SESSION_SECRET is %j", async (value) => {
    vi.stubEnv("SESSION_SECRET", value);
    await expect(signSession(1)).rejects.toThrow(/SESSION_SECRET/);
    await expect(verifySession("x")).rejects.toThrow(/SESSION_SECRET/);
  });

  it("throws when SESSION_SECRET is unset", async () => {
    vi.unstubAllEnvs();
    const saved = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    try {
      await expect(signSession(1)).rejects.toThrow(/SESSION_SECRET/);
    } finally {
      if (saved !== undefined) process.env.SESSION_SECRET = saved;
    }
  });

  it("exposes cookie name and options", () => {
    expect(SESSION_COOKIE).toBe("tracker_session");
    expect(sessionCookieOptions).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  });
});
