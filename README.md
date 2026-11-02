# Weight Tracker

A small Next.js 16 app for logging your weight once a day, watching your progress on a graph, and (only if you opt in) comparing yourself with other people on a leaderboard.

## Features

- **Daily weight entry**: one entry per day (re-submitting a date updates it); edit or delete past entries.
- **Personal progress graph**: a d3 line chart of your weight against your goal.
- **Consent-gated leaderboard and comparison**: rank by a score mixing progress and consistency, and overlay other users' progress (% change) on a d3 chart. Nobody appears unless they opted in.

## Stack

Next.js 16 (App Router, `src/`), TypeScript strict, Tailwind v4, Drizzle ORM + better-sqlite3, zod 4, jose (session JWT cookie), bcryptjs, d3 (scales/paths only; React owns the SVG), Vitest.

Next.js 16 specifics: `middleware.ts` is now `src/proxy.ts` (exports `proxy`, runs on Node.js); route handler `params` is a `Promise`; `cookies()` is async.

## Setup

```bash
npm install
cp .env.example .env.local     # then set SESSION_SECRET (>= 32 chars)
npm run db:migrate
npm run db:seed                # optional demo data
npm run dev                    # http://localhost:3000
```

Environment variables:

| Variable | Purpose |
|---|---|
| `SESSION_SECRET` | Required. Signs session cookies; at least 32 characters. |
| `DATABASE_URL` | SQLite file, default `./data/tracker.db`. |
| `TRUSTED_PROXY_HOPS` | Optional, default `1`. The client IP used for rate limiting is read from the right of `x-forwarded-for`, so it is only trustworthy behind that many proxies that append to the header. The per-email limiter is the real brute-force defence. |

The `db:*` scripts load `.env.local` automatically (`tsx --env-file-if-exists`); you can also export the variables in your shell.

**Demo login:** `demo1@example.com` / `password123` (also `demo2` ... `demo8`). The seed creates 8 users with 30 days of data; 6 share their progress and 2 do not, so consent filtering is visible. Re-running the seed only recreates the `demoN@example.com` users.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm test` | Vitest (unit + route tests, in-memory SQLite) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a Drizzle migration from `schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Migrate, then (re)create demo users |

## Project structure

```
src/
  app/            pages ((auth), (app)) and api/ route handlers (thin)
  proxy.ts        optimistic redirect on session-cookie presence
  components/     ui/ primitives, charts/, features/, layout/
  hooks/          data hooks over the api client
  lib/            api-client, domain/ (pure scoring, stats, progress), validation/ (zod), chart/
  server/
    db/           schema, client, migrations
    repositories/ SQL access (consent filter lives here)
    services/     business rules
    middleware/   compose, withErrorHandler, withAuth, withValidation, withRateLimit
scripts/          migrate.ts, seed.ts
docs/             ARCHITECTURE.md
```

## Request pipeline

```
route -> compose(withErrorHandler, withAuth, withValidation) -> service -> repository -> db
```

Routes only wire a handler into `compose`. Errors thrown anywhere are `AppError` subclasses and are turned into `{ "error": { "code", "message", "details"? } }` by `withErrorHandler`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## How to add a new endpoint

1. Add a zod schema in `src/lib/validation/` (with a test).
2. Add the query to a repository in `src/server/repositories/` (first parameter `db: Db`).
3. Add the business rule to a service in `src/server/services/` (first parameter `db: Db`); throw `AppError` subclasses for failures.
4. Create `src/app/api/<path>/route.ts` and export handlers built with `compose(withErrorHandler, withAuth, withValidation(schema))(handler)`; the handler just calls the service with `getDb()`.
5. Add a typed call in `src/lib/api-client.ts` and, if the UI needs it, a hook in `src/hooks/`.
6. Test the repository and service against `createTestDb()`, and the route for status codes and error shape.

## Scoring

```
score       = 0.7 * progress + 0.3 * consistency            (0-100, 1 decimal)
progress    = clamp(directionalChangePct / 10 * 100, 0, 100) // 10% change toward your goal = full marks
consistency = distinct days logged in the last 30 days (incl. today) / 30 * 100
```

`directionalChangePct` is `(start - current) / start * 100` for a lose goal and `(current - start) / start * 100` for a gain goal.

## Consent and privacy

- Sharing is opt-in: `share_progress` defaults to off and can be changed any time in Settings.
- A user appears on the leaderboard or comparison only if sharing is on. The filter is in the repository query, so no endpoint can leak a non-sharing user.
- Others see only your display name and rounded percentages (1 decimal). Raw weights, emails and password hashes of other users are never returned. You always see your own data.

## API

| Route | Auth | Notes |
|---|---|---|
| `POST /api/auth/register`, `/login` | public, rate-limited | Sets the session cookie |
| `POST /api/auth/logout` | public | Clears the cookie (204) |
| `GET /api/auth/me` | yes | Current user |
| `PUT /api/sharing` | yes | `{ share: boolean }` |
| `GET /api/weights` | yes | Own entries, date ascending |
| `POST /api/weights` | yes | Upsert by date: 201 created / 200 updated; future dates rejected |
| `PATCH` / `DELETE /api/weights/[id]` | yes, owner | Other users' ids return 404 |
| `GET /api/leaderboard` | yes | Sharing users only, ranked by score |
| `GET /api/compare?userIds=1,2` | yes | Your series plus up to 5 sharing users (default: top 4) |
