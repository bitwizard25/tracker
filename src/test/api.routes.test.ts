import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { PUT as putSharing } from "@/app/api/sharing/route";
import { GET as listWeights, POST as postWeight } from "@/app/api/weights/route";
import { DELETE as deleteWeight, PATCH as patchWeight } from "@/app/api/weights/[id]/route";
import { GET as leaderboard } from "@/app/api/leaderboard/route";
import { GET as compare } from "@/app/api/compare/route";
import { setDbForTests } from "@/server/db/client";
import { resetRateLimits } from "@/server/middleware/withRateLimit";
import { todayUtc } from "@/lib/date";
import { createTestDb } from "./createTestDb";

process.env.SESSION_SECRET = "x".repeat(40);

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Opts = { method?: string; body?: unknown; cookie?: string; ip?: string; contentType?: string };
type RouteFn = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

function call(
  handler: RouteFn,
  path: string,
  { method = "GET", body, cookie, ip, contentType = "application/json" }: Opts = {},
  params: Record<string, string> = {},
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = contentType;
  if (cookie) headers.cookie = cookie;
  if (ip) headers["x-forwarded-for"] = ip;
  const init = {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  };
  return handler(new NextRequest(`http://localhost${path}`, init), {
    params: Promise.resolve(params),
  });
}

async function signUp(email: string, displayName = "Person") {
  const res = await call(register, "/api/auth/register", {
    method: "POST",
    body: { email, password: "password123", displayName, goalType: "lose" },
  });
  const cookie = res.headers.getSetCookie()[0]?.split(";")[0] ?? "";
  return { res, cookie, user: ((await res.clone().json()) as Json).user as Json };
}

const log = (cookie: string, entryDate: string, weightKg: number) =>
  call(postWeight, "/api/weights", { method: "POST", cookie, body: { entryDate, weightKg } });

beforeEach(() => {
  setDbForTests(createTestDb());
  resetRateLimits();
});

describe("auth routes", () => {
  it("registers, sets a cookie, and resolves /me through it", async () => {
    const { res, cookie, user } = await signUp("a@example.com");
    expect(res.status).toBe(201);
    expect(user).toMatchObject({ email: "a@example.com", shareProgress: false });
    expect(JSON.stringify(user)).not.toContain("password");
    const meRes = await call(me, "/api/auth/me", { cookie });
    expect(meRes.status).toBe(200);
    expect(((await meRes.json()) as Json).user.id).toBe(user.id);
  });

  it("rejects a duplicate email with 409", async () => {
    await signUp("dup@example.com");
    const { res } = await signUp("dup@example.com");
    expect(res.status).toBe(409);
    expect(((await res.json()) as Json).error.code).toBe("CONFLICT");
  });

  it("returns identical 401s for wrong password and unknown email", async () => {
    await signUp("real@example.com");
    const attempt = (email: string, password: string) =>
      call(login, "/api/auth/login", { method: "POST", body: { email, password } });
    const wrong = await attempt("real@example.com", "wrongpass1");
    const unknown = await attempt("ghost@example.com", "wrongpass1");
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await wrong.json()).toEqual(await unknown.json());
  });

  it("logs in with correct credentials and sets a cookie", async () => {
    await signUp("ok@example.com");
    const res = await call(login, "/api/auth/login", {
      method: "POST",
      body: { email: "OK@example.com", password: "password123" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie()[0]).toContain("tracker_session=");
  });

  it("clears the cookie on logout with 204", async () => {
    const res = await call(logout, "/api/auth/logout", { method: "POST" });
    expect(res.status).toBe(204);
    expect(res.headers.getSetCookie()[0]).toMatch(/tracker_session=;.*Max-Age=0/i);
  });

  it("blocks the 11th login attempt for one email across different IPs", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await call(login, "/api/auth/login", {
        method: "POST",
        ip: `10.0.0.${i}`,
        body: { email: "victim@example.com", password: "wrongpass1" },
      });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe("weight routes", () => {
  it("returns the standard 401 shape when unauthenticated", async () => {
    const res = await call(listWeights, "/api/weights");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: expect.any(String) },
    });
  });

  it("upserts the same date: 201 then 200 with a single row", async () => {
    const { cookie } = await signUp("w@example.com");
    const today = todayUtc();
    const first = await log(cookie, today, 80);
    const second = await log(cookie, today, 79.5);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    const list = (await (await call(listWeights, "/api/weights", { cookie })).json()) as Json;
    expect(list.entries).toEqual([{ id: expect.any(Number), entryDate: today, weightKg: 79.5 }]);
  });

  it("filters the list by from/to and keeps working without params", async () => {
    const { cookie } = await signUp("r@example.com");
    const other = await signUp("r2@example.com");
    for (const d of ["2026-01-01", "2026-01-05", "2026-01-09"]) await log(cookie, d, 80);
    await log(other.cookie, "2026-01-05", 60);
    const get = async (qs: string) => {
      const body = (await (await call(listWeights, `/api/weights${qs}`, { cookie })).json()) as Json;
      return body.entries.map((e: Json) => e.entryDate);
    };
    expect(await get("")).toHaveLength(3);
    expect(await get("?from=2026-01-05")).toEqual(["2026-01-05", "2026-01-09"]);
    expect(await get("?to=2026-01-05")).toEqual(["2026-01-01", "2026-01-05"]);
    expect(await get("?from=2026-01-05&to=2026-01-05")).toEqual(["2026-01-05"]);
  });

  it.each([
    "?from=2026-02-30",
    "?to=nope",
    "?from=2026-01-02&to=2026-01-01",
    "?from=2026-01-01&to=2027-01-03",
  ])("rejects bad range %s with 400", async (qs) => {
    const { cookie } = await signUp("q@example.com");
    const res = await call(listWeights, `/api/weights${qs}`, { cookie });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Json;
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toBeDefined();
  });

  it("returns 401 for a ranged request when unauthenticated", async () => {
    const res = await call(listWeights, "/api/weights?from=2026-01-01");
    expect(res.status).toBe(401);
  });

  it("rejects invalid bodies with 400 and details", async () => {
    const { cookie } = await signUp("v@example.com");
    const res = await log(cookie, "not-a-date", 5);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Json;
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toBeDefined();
  });

  it("rejects non-JSON content types", async () => {
    const { cookie } = await signUp("t@example.com");
    const res = await call(postWeight, "/api/weights", {
      method: "POST",
      cookie,
      contentType: "text/plain",
      body: JSON.stringify({ entryDate: todayUtc(), weightKg: 80 }),
    });
    expect(res.status).toBe(400);
  });

  it("updates and deletes own entries, 404 for another user", async () => {
    const owner = await signUp("owner@example.com");
    const other = await signUp("other@example.com");
    const entry = ((await (await log(owner.cookie, todayUtc(), 80)).json()) as Json).entry;
    const params = { id: String(entry.id) };
    const path = `/api/weights/${entry.id}`;

    const crossPatch = await call(
      patchWeight,
      path,
      { method: "PATCH", cookie: other.cookie, body: { weightKg: 70 } },
      params,
    );
    const crossDelete = await call(
      deleteWeight,
      path,
      { method: "DELETE", cookie: other.cookie },
      params,
    );
    expect(crossPatch.status).toBe(404);
    expect(crossDelete.status).toBe(404);

    const patched = await call(
      patchWeight,
      path,
      { method: "PATCH", cookie: owner.cookie, body: { weightKg: 78 } },
      params,
    );
    expect(((await patched.json()) as Json).entry.weightKg).toBe(78);
    const deleted = await call(
      deleteWeight,
      path,
      { method: "DELETE", cookie: owner.cookie },
      params,
    );
    expect(deleted.status).toBe(204);
  });

  it("rejects a non-integer id with 400", async () => {
    const { cookie } = await signUp("id@example.com");
    const res = await call(
      deleteWeight,
      "/api/weights/abc",
      { method: "DELETE", cookie },
      { id: "abc" },
    );
    expect(res.status).toBe(400);
  });
});

describe("consent-gated social routes", () => {
  async function sharer() {
    const user = await signUp("sharer@example.com", "Sharer");
    await log(user.cookie, todayUtc(), 100);
    return user;
  }
  const share = (cookie: string) =>
    call(putSharing, "/api/sharing", { method: "PUT", cookie, body: { share: true } });

  it("excludes non-sharing users from the leaderboard and never leaks weights or emails", async () => {
    const hidden = await sharer();
    const viewer = await signUp("viewer@example.com", "Viewer");
    const res = await call(leaderboard, "/api/leaderboard", { cookie: viewer.cookie });
    const text = await res.text();
    const ids = (JSON.parse(text).entries as Json[]).map((e) => e.userId);
    expect(ids).not.toContain(hidden.user.id);
    expect(text).not.toContain("weightKg");
    expect(text).not.toContain("@example.com");
  });

  it("shows a user after PUT /api/sharing with share true", async () => {
    const user = await sharer();
    const viewer = await signUp("viewer@example.com", "Viewer");
    const put = await share(user.cookie);
    expect(((await put.json()) as Json).user.shareProgress).toBe(true);
    const res = await call(leaderboard, "/api/leaderboard", { cookie: viewer.cookie });
    const entries = ((await res.json()) as Json).entries as Json[];
    expect(entries.find((e) => e.userId === user.user.id)).toMatchObject({
      displayName: "Sharer",
      isYou: false,
    });
  });

  it("compare never returns a non-sharing user, even when requested by id", async () => {
    const hidden = await sharer();
    const viewer = await signUp("viewer@example.com", "Viewer");
    await log(viewer.cookie, todayUtc(), 70);
    const res = await call(compare, `/api/compare?userIds=${hidden.user.id}`, {
      cookie: viewer.cookie,
    });
    const text = await res.text();
    const series = JSON.parse(text).series as Json[];
    expect(series.map((s) => s.userId)).toEqual([viewer.user.id]);
    expect(text).not.toContain("weightKg");
  });

  it("compare includes a sharing user as relative values only", async () => {
    const user = await sharer();
    await share(user.cookie);
    const viewer = await signUp("viewer@example.com", "Viewer");
    const res = await call(compare, `/api/compare?userIds=${user.user.id}`, {
      cookie: viewer.cookie,
    });
    const text = await res.text();
    const ids = (JSON.parse(text).series as Json[]).map((s) => s.userId);
    expect(ids).toContain(user.user.id);
    expect(text).not.toContain("weightKg");
  });
});
