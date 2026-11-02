# Architecture

## Layers (one-way dependencies)

```
route handler -> middleware chain -> service -> repository -> db
```

| Layer | Location | Responsibility |
|---|---|---|
| Route | `src/app/api/**/route.ts` | Wire a handler into `compose(...)`. No logic. |
| Middleware | `src/server/middleware/` | `withErrorHandler` (error shape), `withAuth` (session -> `ctx.user`), `withValidation` (zod -> `ctx.body`/`ctx.query`), `withRateLimit`. Composed by `compose`. |
| Service | `src/server/services/` | Business rules and orchestration; throws `AppError`s. |
| Repository | `src/server/repositories/` | The only place that talks SQL (Drizzle). |
| DB | `src/server/db/` | Schema, client, migrations. |

## Rules

- Repositories and services take `db: Db` as the first parameter. They never import the `getDb()` singleton; only route handlers and scripts call `getDb()`. Tests pass `createTestDb()` (in-memory, migrated).
- Errors are `AppError` subclasses (`src/server/errors.ts`). The response body is always `{ "error": { "code", "message", "details"? } }`.
- Consent is enforced in the repository query (`social.repository.ts`): only `share_progress = 1` users can be returned. Responses about other users contain `displayName` and percentages only, never weights, emails or hashes.
- Pure logic (scoring, stats, progress, dates, consent helpers) lives in `src/lib/domain/` with no I/O, so server and UI share it and it is trivially testable.
- The UI never imports from `src/server/**`. It talks to the API through `src/lib/api-client.ts` and the hooks in `src/hooks/`.
- Charts: d3 computes scales, paths and ticks; React renders the SVG. No d3 DOM mutation.
- Dates are `YYYY-MM-DD` strings in UTC (`src/lib/date.ts`); weights are kg, valid range 20-500.

## Next.js 16 notes

- `src/proxy.ts` replaces `middleware.ts`; it only does an optimistic redirect on cookie presence. Real auth is `withAuth`.
- Route `params` is a `Promise`; `compose` awaits it before building the context.
- `better-sqlite3` is auto-externalized; the app is fully dynamic.

## Data

SQLite via better-sqlite3 (`DATABASE_URL`, default `./data/tracker.db`). Tables: `users` (incl. `share_progress`, `share_consented_at`), `weight_entries` (unique per user and date, cascade delete), `streaks`. Generate migrations with `npm run db:generate`; apply with `npm run db:migrate` or `npm run db:seed`.

## Tests

Colocated `*.test.ts(x)`; `src/test/createTestDb.ts` provides an in-memory migrated database. Run with `npm test`.
