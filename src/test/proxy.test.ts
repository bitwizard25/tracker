import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";

const run = (path: string, cookie?: string) =>
  proxy(new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie } : {} }));

describe("proxy", () => {
  it("redirects protected pages to /login without a session cookie", () => {
    for (const path of ["/dashboard", "/log", "/settings/profile"]) {
      expect(run(path).headers.get("location")).toBe("http://localhost/login");
    }
  });

  it("redirects /login and /register to /dashboard with a session cookie", () => {
    for (const path of ["/login", "/register"]) {
      expect(run(path, "tracker_session=abc").headers.get("location")).toBe(
        "http://localhost/dashboard",
      );
    }
  });

  it("passes through otherwise", () => {
    expect(run("/dashboard", "tracker_session=abc").headers.get("location")).toBeNull();
    expect(run("/login").headers.get("location")).toBeNull();
  });

  it("never matches api or static paths", () => {
    expect(config.matcher.join()).not.toMatch(/api|_next|static/);
  });
});
