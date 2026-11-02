# Weight Tracker MVP Implementation Plan

**Spec:** `C:\Users\bhoya\.claude\plans\on-tech-side-we-curious-twilight.md` (approved by the user; it is the binding authority).

**Goal:** A clean Next.js 16 codebase for a weight-tracking app: daily manual weight entry, a personal d3 progress graph, a consent-gated leaderboard (consistency + weight change), and a d3 comparison graph against other users.

## Global Constraints (apply to EVERY task)

- **Next.js 16 is not the Next.js you know.** Read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code. Known facts: `middleware.ts` is now `src/proxy.ts` (exports `proxy`, runs on Node.js); route handler `params` is a `Promise` (`await ctx.params`); `cookies()` from `next/headers` is async; `better-sqlite3` is auto-externalized.
- **Stack:** TypeScript strict, App Router, `src/` dir, `@/*` alias, Tailwind v4, Drizzle ORM + better-sqlite3, zod 4, jose, bcryptjs, d3 (charts), Vitest. All already installed; do not add other runtime dependencies without need.
- **Layering, one-way:** `route handler → middleware chain → service → repository → db`. Route files stay thin. UI never imports from `src/server/**`; it talks to the API via `src/lib/api-client.ts`.
- **DB injection:** repositories and services take `db: Db` as their first parameter (type exported from `src/server/db/client.ts`) so tests can pass an in-memory db. Never import the global `db` singleton inside repositories/services.
- **Errors:** throw `AppError` subclasses (`src/server/errors.ts`). API error body is always `{ "error": { "code": string, "message": string, "details"?: unknown } }`.
- **Dates:** `entry_date` is a `YYYY-MM-DD` string. Weight is kg, `REAL`, valid range 20–500.
- **CONSENT RULE (user requirement, non-negotiable):** a user appears in the leaderboard or comparison graph, by name or progress, ONLY if `users.share_progress = 1`. Default is 0. The filter lives in the repository query so no endpoint can leak a non-consenting user. A user's own personal data is always visible to themselves.
- **PRIVACY RULE:** other users are exposed by `displayName` and relative % values only. Raw weights of other users must never appear in any response. Never return `password_hash` or `email` of other users.
- **Charts use d3** (`d3-scale`, `d3-shape`, `d3-array`, `d3-time-format`). React owns the SVG DOM; d3 only computes scales/paths/ticks. No `d3.select(...).append(...)` DOM mutation.
- **Clean code:** small files, named exports, no dead code, no `any`. Tests are real (assert behavior), colocated as `*.test.ts(x)` next to the code or under `src/test/`.
- **Commits:** one or more commits per task, conventional-commit style, each ending with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never commit `.env`, `*.db`, or `.superpowers/`.
- **Scripts available after Task 1:** `npm test` (vitest run), `npm run typecheck`, `npm run lint`, `npm run build`.

## Shared interfaces (fixed names; tasks must match exactly)

```ts
// src/server/errors.ts
class AppError extends Error { constructor(status: number, code: string, message: string, details?: unknown) }
class ValidationError extends AppError   // 400 'VALIDATION_ERROR'
class UnauthorizedError extends AppError // 401 'UNAUTHORIZED'
class NotFoundError extends AppError     // 404 'NOT_FOUND'
class ConflictError extends AppError     // 409 'CONFLICT'
class RateLimitError extends AppError    // 429 'RATE_LIMITED'

// src/server/db/client.ts
type Db = BetterSQLite3Database<typeof schema>
function createDb(filename: string): Db        // runs no migrations
function getDb(): Db                           // lazy singleton from process.env.DATABASE_URL ?? './data/tracker.db'
// src/test/createTestDb.ts
function createTestDb(): Db                    // ':memory:' with migrations from src/server/db/migrations applied

// src/lib/domain/progress.ts
type WeightPoint = { date: string; weightKg: number }
type PercentPoint = { date: string; pct: number }
function toPercentSeries(entries: WeightPoint[]): PercentPoint[]   // sorted by date asc; pct = (w - firstW)/firstW*100, rounded 2dp
function directionalChangePct(goalType: 'lose'|'gain', startKg: number, currentKg: number): number // lose: (start-current)/start*100, gain: (current-start)/start*100

// src/lib/domain/scoring.ts
const PROGRESS_CAP_PCT = 10; const WINDOW_DAYS = 30; const WEIGHTS = { progress: 0.7, consistency: 0.3 }
function progressScore(directionalPct: number): number     // clamp(directionalPct / PROGRESS_CAP_PCT * 100, 0, 100)
function consistencyScore(dates: string[], today: string): number // distinct dates within the last WINDOW_DAYS days incl. today / WINDOW_DAYS * 100, capped 100
function leaderboardScore(progress: number, consistency: number): number // 0.7*p + 0.3*c, rounded 1dp

// Session user (returned by auth + injected as ctx.user)
type PublicUser = { id: number; email: string; displayName: string; goalType: 'lose'|'gain'; goalWeightKg: number | null; shareProgress: boolean }

// Middleware (src/server/middleware/*)
type RouteContext<T = unknown> = { req: NextRequest; params: Record<string,string>; user?: PublicUser; body?: T; query?: Record<string,string> }
type Handler = (ctx: RouteContext) => Promise<Response>
type Middleware = (next: Handler) => Handler
function compose(...mws: Middleware[]): (handler: Handler) => (req: NextRequest, routeCtx: { params: Promise<Record<string,string>> }) => Promise<Response>
```

## API contract (fixed)

| Route | Auth | Body / Query | Success |
|---|---|---|---|
| `POST /api/auth/register` | public, rate-limited | `{email, password(min 8), displayName(2-30), goalType, goalWeightKg?}` | 201 `{user}` + session cookie |
| `POST /api/auth/login` | public, rate-limited | `{email, password}` | 200 `{user}` + cookie; wrong creds → 401 `INVALID_CREDENTIALS` |
| `POST /api/auth/logout` | public | – | 204, cookie cleared |
| `GET /api/auth/me` | required | – | 200 `{user}` |
| `PUT /api/sharing` | required | `{share: boolean}` | 200 `{user}`; sets/clears `share_progress` and `share_consented_at` |
| `GET /api/weights` | required | – | 200 `{entries:[{id, entryDate, weightKg}]}` own, date asc |
| `POST /api/weights` | required | `{entryDate, weightKg}` | upsert by (user, date): 201 created / 200 updated, `{entry}`; future dates → 400 |
| `PATCH /api/weights/[id]` | required, owner | `{weightKg}` | 200 `{entry}`; other user's id → 404 |
| `DELETE /api/weights/[id]` | required, owner | – | 204; other user's id → 404 |
| `GET /api/leaderboard` | required | – | 200 `{entries:[{rank, userId, displayName, progressPct, consistencyPct, score, isYou}]}` sharing users only, score desc |
| `GET /api/compare` | required | `?userIds=1,2` (max 5, optional) | 200 `{series:[{userId, displayName, isYou, points:[{date,pct}]}]}`; includes the caller's own series always (`isYou:true`); other ids included only if sharing, silently dropped otherwise; default others = top 4 on the leaderboard |

---

## Task 1: Database foundation, errors, test infrastructure

**Files:** `drizzle.config.ts`, `src/server/db/{schema.ts,client.ts}`, `src/server/db/migrations/*` (generated), `src/server/errors.ts`, `src/test/createTestDb.ts`, `vitest.config.ts`, `.env.example`, `package.json` scripts, `data/.gitkeep`, `.gitignore` (ignore `data/*.db`).

- Drizzle schema, SQLite. `users(id integer pk autoincrement, email text unique not null (stored lowercased), password_hash text not null, display_name text not null, goal_type text not null check in ('lose','gain'), goal_weight_kg real null, share_progress integer not null default 0, share_consented_at text null (ISO), created_at text not null default current_timestamp)`. `weight_entries(id integer pk autoincrement, user_id integer not null references users(id) on delete cascade, entry_date text not null, weight_kg real not null, created_at text not null default current_timestamp)` with `unique(user_id, entry_date)` and an index on `(user_id, entry_date)`.
- `client.ts` per the shared interface: `createDb(filename)` enables `PRAGMA journal_mode=WAL` (skip for `:memory:`) and `foreign_keys=ON`; `getDb()` lazy singleton; creates parent directory for file paths.
- Generate the migration with drizzle-kit (`npm run db:generate`) and commit it. `npm run db:migrate` applies migrations to `DATABASE_URL` via a small `scripts/migrate.ts` run with `tsx`.
- `errors.ts` per the shared interface.
- `createTestDb()` applies the generated migrations with drizzle's `migrate` on `:memory:`.
- `vitest.config.ts`: node environment, `@/` alias matching tsconfig, include `src/**/*.test.ts(x)`.
- package.json scripts: `test` = `vitest run`, `typecheck` = `tsc --noEmit`, `db:generate`, `db:migrate`, `db:seed` (= `tsx scripts/seed.ts`, script created in Task 10).
- `.env.example`: `SESSION_SECRET=change-me-to-a-long-random-string-at-least-32-chars` and `DATABASE_URL=./data/tracker.db`.
- Tests (`src/server/db/schema.test.ts`): inserting two entries for same user+date throws; deleting a user cascades its entries; `share_progress` defaults to 0; `goal_type` check rejects `'maintain'`.
- Done when `npm test`, `npm run typecheck`, `npm run lint` pass.

## Task 2: Domain functions (pure, unit tested)

**Files:** `src/lib/domain/progress.ts`, `src/lib/domain/scoring.ts`, `*.test.ts` for each.

Implement exactly the signatures and formulas in "Shared interfaces". Notes: `toPercentSeries([])` returns `[]`; unsorted input is sorted by date; first point is always `pct: 0`. `consistencyScore` takes `today` as a parameter (no `Date.now()` inside) and ignores dates outside the window or in the future. The window is 30 calendar days ending on `today` inclusive, i.e. `today-29 … today`. Tests must cover: empty input, single entry, lose vs gain direction, negative directional change clamped to 0 in `progressScore`, cap at 100, duplicate dates counted once, window boundary (`today-29` included, `today-30` excluded, `today+1` excluded), rounding.

## Task 3: Repositories, session, auth and weight services

**Files:** `src/server/repositories/{user,weight}.repository.ts`, `src/server/session.ts`, `src/server/services/{auth,weight}.service.ts`, tests for each.

- `user.repository`: `createUser`, `findByEmail`, `findById`, `setSharing(db, userId, share)` (sets `share_progress` and `share_consented_at` = now ISO when true, null when false). Map rows to `PublicUser` via a single `toPublicUser` helper that never includes `password_hash`.
- `weight.repository`: `listByUser`, `upsertEntry(db, userId, entryDate, weightKg)` returning `{entry, created: boolean}`, `updateWeight(db, userId, id, weightKg)` and `deleteEntry(db, userId, id)` both scoped by `user_id` and returning whether a row was affected.
- `session.ts`: `signSession(userId): Promise<string>` / `verifySession(token): Promise<number | null>` using `jose` HS256 with `SESSION_SECRET` (throw at call time if missing or under 32 chars), 7-day expiry; `SESSION_COOKIE = 'tracker_session'`; `sessionCookieOptions` (httpOnly, sameSite lax, secure in production, path `/`, maxAge 7 days).
- `auth.service`: `register` (lowercase email, bcryptjs hash with cost 10, `ConflictError` on duplicate email), `login` (same `INVALID_CREDENTIALS` 401 for unknown email and wrong password; do a dummy compare for unknown email to avoid timing leak), `getUser`.
- `src/lib/date.ts` (created here, reused by Task 6): `todayUtc(): string` (`YYYY-MM-DD`, UTC) and `addDays(date: string, n: number): string`.
- `weight.service`: `list`, `logWeight(db, userId, input, today)` (`today` is injected, never read inside the service; rejects `entryDate` later than `addDays(today, 1)` with `ValidationError` — the one-day tolerance exists so users ahead of UTC, e.g. India at UTC+5:30, can log their local "today"; range 20-500), `update`, `remove` (both throw `NotFoundError` when the row is not the caller's).
- Tests use `createTestDb()`. Cover duplicate email, case-insensitive login, wrong password, upsert created/updated flag, owner scoping (user B cannot update/delete user A's entry), token tamper and expiry returns null.

## Task 4: Consent, leaderboard and compare services

**Files:** `src/server/repositories/social.repository.ts`, `src/server/services/{sharing,leaderboard,compare}.service.ts`, tests.

- `social.repository.listSharingUsersWithEntries(db)` returns, for users with `share_progress = 1` ONLY, `{userId, displayName, goalType, entries:[{date, weightKg}]}`. This is the single choke point enforcing the CONSENT RULE.
- `sharing.service.setSharing(db, userId, share)` returns the updated `PublicUser`.
- `leaderboard.service.getLeaderboard(db, viewerId, today)`: for each sharing user with at least 1 entry compute `progressPct = progressScore(directionalChangePct(goalType, firstWeight, latestWeight))`, `consistencyPct = consistencyScore(dates, today)`, `score = leaderboardScore(...)`; sort by score desc (tie-break: higher consistency, then lower userId); assign 1-based `rank`; `isYou` flag. Output shape per the API contract; raw weights never included.
- `compare.service.getComparison(db, viewerId, requestedIds, today)`: viewer's own series always included first with `isYou: true` (built from the viewer's own entries even when not sharing; omit if viewer has no entries); other ids kept only if the user is in the sharing set; if `requestedIds` is empty, default to the top 4 by leaderboard rank excluding the viewer; cap total others at 5. Series via `toPercentSeries`.
- Tests (critical): a non-sharing user NEVER appears in leaderboard or compare even when explicitly requested by id; toggling sharing off removes them immediately; no weight values leak (assert response objects have no `weightKg` key); ranking math and tie-breaks; viewer-not-sharing still gets own series.

## Task 5: Middleware chain and request schemas

**Files:** `src/server/middleware/{compose.ts,withErrorHandler.ts,withAuth.ts,withValidation.ts,withRateLimit.ts}`, `src/lib/validation/{auth.ts,weight.ts,sharing.ts,compare.ts}`, tests.

- Implement the `RouteContext`/`Handler`/`Middleware`/`compose` types and behavior from "Shared interfaces". `compose(a, b, c)(handler)` runs `a` outermost. The returned route function awaits `routeCtx.params`.
- `withErrorHandler`: catches `AppError` → JSON error body with its status; `ZodError` → 400 `VALIDATION_ERROR` with `details` = flattened issues; anything else → 500 `INTERNAL_ERROR` with a generic message (log the real error with `console.error`, never leak it).
- `withAuth`: reads the session cookie from `req.cookies`, verifies it, loads the user via `findById(getDb(), id)`, injects `ctx.user`; missing/invalid/unknown user → `UnauthorizedError`. Uses `getDb()` so a `deps` override parameter `withAuth({ db })` is accepted for tests.
- `withValidation({ body?, query? })`: parses JSON body (invalid JSON → 400) and `req.nextUrl.searchParams` with zod, sets `ctx.body` / `ctx.query`.
- `withRateLimit({ limit, windowMs, key? })`: in-memory fixed-window limiter keyed by client IP (`x-forwarded-for` first value, else `'local'`); exceeding → `RateLimitError` whose `details` is `{ retryAfterSeconds: number }`, and `withErrorHandler` sets a `Retry-After` header when the error code is `RATE_LIMITED`; exposes a `resetRateLimits()` for tests.
- Zod schemas per the API contract (shared by client and server). `entryDate` regex `^\d{4}-\d{2}-\d{2}$` and a real calendar date; `weightKg` number 20-500 with max 2 decimals tolerated (round to 2dp).
- Tests: order of composition, each error mapping incl. 500 not leaking message, auth success/failure paths using `createTestDb`, validation of good/bad body and query, rate limit blocks the (limit+1)th call and resets.

## Task 6: API route handlers and proxy

**Files:** `src/app/api/auth/{register,login,logout,me}/route.ts`, `src/app/api/sharing/route.ts`, `src/app/api/weights/route.ts`, `src/app/api/weights/[id]/route.ts`, `src/app/api/leaderboard/route.ts`, `src/app/api/compare/route.ts`, `src/proxy.ts`, route tests `src/app/api/**/*.test.ts` (or `src/test/api.*.test.ts`).

- Each route file is thin: `export const POST = compose(withErrorHandler, withAuth(), withValidation({body: schema}))(handler)` where the handler calls the service and returns `Response.json`. Follow the API contract table exactly (status codes, shapes). Register/login set the session cookie via `NextResponse.cookies.set(SESSION_COOKIE, token, sessionCookieOptions)`; logout clears it. Compare parses `userIds` as comma-separated ints.
- `today` for scoring and date validation comes from `todayUtc()` in `src/lib/date.ts` (created in Task 3), injected into services by the handler.
- `src/proxy.ts`: optimistic redirect only. If the request path starts with `/dashboard`, `/log`, `/leaderboard`, `/compare`, `/settings` and there is no session cookie → redirect to `/login`; if a session cookie exists and path is `/login` or `/register` → redirect to `/dashboard`. Export `config.matcher` for those paths only (never `/api`, `_next`, static). Real auth is `withAuth`.
- Route tests call the exported handlers directly with `NextRequest` objects against a test DB (set `DATABASE_URL=:memory:` is NOT enough across modules, so make `getDb()` overridable via an exported `setDbForTests(db)` in `client.ts`). Cover: register→me via cookie, duplicate email 409, unauthenticated `/api/weights` 401 with the standard error shape, upsert twice same date gives 201 then 200 with one row, invalid body 400 with details, cross-user PATCH/DELETE 404, sharing toggle then leaderboard visibility, compare never returns a non-sharing user, no `weightKg` in leaderboard/compare responses for other users.
- Done when the full test suite, typecheck, lint pass and `npm run build` succeeds.

## Task 7: UI foundation, auth pages, app shell

**Files:** `src/lib/api-client.ts`, `src/components/ui/{Button,Input,Card,Spinner,Alert}.tsx`, `src/components/layout/{AppHeader,AppNav}.tsx`, `src/app/layout.tsx`, `src/app/page.tsx` (redirect: logged-in → `/dashboard`, else `/login`; use the cookie via `cookies()`), `src/app/(auth)/{layout.tsx,login/page.tsx,register/page.tsx}`, `src/app/(app)/layout.tsx`, `src/hooks/useCurrentUser.ts`, `src/components/features/auth/{LoginForm,RegisterForm}.tsx`, `src/app/(app)/settings/page.tsx` + `src/components/features/settings/SharingToggle.tsx`.

- `api-client.ts`: typed `apiFetch<T>(path, init?)` that throws an `ApiError(status, code, message, details)` on non-2xx using the standard error body; thin typed wrappers `api.auth.*`, `api.weights.*`, `api.sharing.*`, `api.leaderboard.get()`, `api.compare.get(ids?)`. Response types are exported from `src/lib/types.ts` (shared with Task 8/9).
- UI primitives are small, accessible (labels, `aria-invalid`, focus rings), Tailwind v4, support `className` merge. Clean, calm visual design appropriate for a health app; mobile-first.
- Auth forms: client components, validate with the shared zod schemas, show field errors and API errors, redirect to `/dashboard` on success (`router.replace` + `router.refresh`).
- `useCurrentUser` returns `{ user: PublicUser | null, isLoading: boolean, refresh: () => Promise<void> }` (fetches `/api/auth/me`; `refresh` is used by Task 9 after the sharing choice changes).
- **Exception to the "UI never imports `src/server/**`" rule:** server components under `src/app` (only `(app)/layout.tsx` and `src/app/page.tsx`) may import `src/server/session.ts` and the `auth.service`/`getDb` solely to gate access. Client components and hooks may never import `src/server/**`.
- `(app)/layout.tsx` is a server component that verifies the session server-side (using the services directly with `getDb()`, redirect to `/login` if invalid) and renders the header + nav (Dashboard, Log, Leaderboard, Compare, Settings, Logout).
- Settings page shows the sharing toggle with plain-language explanation: "Share my name and progress on the leaderboard and comparison graph. Others see your display name and % change only, never your weights." Toggle calls `PUT /api/sharing`.
- Tests: `api-client` unit test (error mapping, success parse) with a mocked `fetch`. Component tests optional beyond that; `npm run build` must pass.

## Task 8: d3 charts, dashboard and log page

**Files:** `src/components/charts/{useChartDimensions.ts,LineChart.tsx,WeightChart.tsx}`, `src/lib/chart/scales.ts` (+ test), `src/hooks/useWeights.ts`, `src/components/features/weight/{WeightForm,WeightHistory,StatsSummary}.tsx`, `src/app/(app)/{dashboard,log}/page.tsx`.

- `LineChart` is the shared d3-driven SVG base used by Task 9 too. Props: `series: {id, label, color, points: {x: Date, y: number}[], emphasized?: boolean}[]`, `yLabel`, `formatY`, optional `height`. Uses `d3-scale` (`scaleTime`, `scaleLinear`), `d3-shape` (`line`, `curveMonotoneX`), `d3-array` (`extent`, `bisector`), `d3-time-format` for ticks; responsive width via `useChartDimensions` (ResizeObserver). Hover/touch crosshair with tooltip using the bisector; keyboard-accessible summary (`role="img"` + `aria-label` and a visually hidden data table fallback). Axis/tick/domain math is extracted into `src/lib/chart/scales.ts` as pure, tested functions (`buildScales`, `paddedExtent`). Handles 0 points (empty state) and 1 point (single dot).
- `WeightChart` renders the user's own weights (kg) plus an optional dashed goal line when `goalWeightKg` is set.
- `/log`: `WeightForm` (date defaults to today, `max` = today, weight input step 0.1) posts via `api.weights.upsert`; recent entries list (`WeightHistory`) with edit and delete. Re-submitting a date updates it (surface "Updated" vs "Saved").
- `/dashboard`: `StatsSummary` (current, start, change kg and %, days logged in the last 30, current streak = consecutive logged days ending today, or ending yesterday if today is not logged yet) and `WeightChart`. Empty state links to `/log`. Stats calculations live in `src/lib/domain/stats.ts` with tests.
- Done when tests, typecheck, lint, build pass.

## Task 9: Leaderboard, comparison and consent prompt

**Files:** `src/components/features/social/{ConsentPrompt,LeaderboardTable,CompareControls}.tsx`, `src/components/charts/CompareChart.tsx`, `src/hooks/{useLeaderboard,useCompare}.ts`, `src/app/(app)/{leaderboard,compare}/page.tsx`.

- **Consent prompt (user requirement):** if the viewer's `shareProgress` is false, the leaderboard and compare pages show a `ConsentPrompt` card before anything about them is shown: explains exactly what becomes visible (display name + % change + rank, never weights), with buttons "Share my progress" (calls `PUT /api/sharing {share:true}`, then refetches) and "Not now" (dismisses for the session via `sessionStorage`; the viewer stays hidden from others). Non-sharing viewers may still view the board of those who opted in. A "Stop sharing" control is available on these pages and in Settings.
- `LeaderboardTable`: rank, display name, progress %, consistency %, score, highlighted "You" row; empty state when nobody has opted in. Explain the score ("70% weight change toward your goal, 30% logging consistency over the last 30 days") in a short caption.
- `CompareChart` wraps the shared `LineChart` with y = % change from each user's first entry, the viewer's line emphasized, a legend with toggleable series (max 5 others), and `CompareControls` to pick which sharing users to include (defaults to top 4).
- Tests: a pure helper `src/lib/chart/compareSeries.ts` that maps API series to `LineChart` series (assign stable colors, emphasize `isYou`) with unit tests; consent prompt visibility logic as a small pure function with tests.
- Done when tests, typecheck, lint, build pass.

## Task 10: Seed data, README, end-to-end verification

**Files:** `scripts/seed.ts`, `README.md`, `docs/ARCHITECTURE.md` (short), `package.json` (if needed).

- `scripts/seed.ts` (run with `tsx`): migrates, then creates 8 demo users (`demo1@example.com` … `demo8@example.com`, password `password123`, varied goals) with 30 days of plausible weight data each (deterministic via a seeded PRNG); 6 of them `share_progress = 1`, 2 not (so consent filtering is visible); plus idempotent behavior (re-running does not duplicate; it clears and recreates the demo users only).
- `README.md`: what it is, stack, setup (`npm install`, copy `.env.example` → `.env.local`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`), scripts table, project structure, the request pipeline diagram (`route → compose(withErrorHandler, withAuth, withValidation) → service → repository → db`), "How to add a new endpoint" in 6 steps, the scoring formula, the consent/privacy rule.
- `docs/ARCHITECTURE.md`: layering rules and where things live (keep under ~80 lines).
- **Verification (do it for real, report output):** `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Then `npm run db:migrate && npm run db:seed`, start `npm run dev` on a free port, and with `curl` (cookie jar) verify: unauthenticated `/api/weights` → 401 standard error shape; login as demo1 → `/api/weights` works; same-date POST twice → 201 then 200; invalid body → 400 with details; `/api/leaderboard` lists only the 6 sharing users and contains no `weightKg`; `/api/compare?userIds=<non-sharing user id>` omits that user. Stop the dev server afterwards. Fix any failure found (smallest change) and report.
