import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, apiFetch } from "@/lib/api-client";

function mockFetch(response: Response) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("parses a successful JSON response", async () => {
    mockFetch(Response.json({ user: { id: 1 } }));
    await expect(apiFetch<{ user: { id: number } }>("/api/auth/me")).resolves.toEqual({
      user: { id: 1 },
    });
  });

  it("returns undefined for 204", async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(apiFetch("/api/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });

  it("maps the standard error body to ApiError", async () => {
    mockFetch(
      Response.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Bad login", details: { a: 1 } } },
        { status: 401 },
      ),
    );
    const err = await apiFetch("/api/auth/login", { method: "POST" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Bad login",
      details: { a: 1 },
    });
  });

  it("falls back to a generic error when the body is not the standard shape", async () => {
    mockFetch(new Response("boom", { status: 500 }));
    const err = await apiFetch("/api/x").catch((e) => e);
    expect(err).toMatchObject({ status: 500, code: "UNKNOWN_ERROR" });
  });
});

describe("api wrappers", () => {
  it("sends JSON bodies with content-type for login", async () => {
    const fn = mockFetch(Response.json({ user: { id: 1 } }));
    await api.auth.login({ email: "a@b.co", password: "password1" });
    const [path, init] = fn.mock.calls[0];
    expect(path).toBe("/api/auth/login");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ email: "a@b.co", password: "password1" });
  });

  it("builds the compare query from ids", async () => {
    const fn = mockFetch(Response.json({ series: [] }));
    await api.compare.get([2, 3]);
    expect(fn.mock.calls[0][0]).toBe("/api/compare?userIds=2,3");
  });

  it("omits the compare query when no ids are given", async () => {
    const fn = mockFetch(Response.json({ series: [] }));
    await api.compare.get();
    expect(fn.mock.calls[0][0]).toBe("/api/compare");
  });

  it("reports created=true for a 201 weight save", async () => {
    mockFetch(Response.json({ entry: { id: 1, entryDate: "2026-01-01", weightKg: 80 } }, { status: 201 }));
    const res = await api.weights.save({ entryDate: "2026-01-01", weightKg: 80 });
    expect(res.created).toBe(true);
  });
});
