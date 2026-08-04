# API Integration Design

Date: 2026-08-04

## Problem

The mobile app (`apps/mobile-web`) currently renders entirely from a static
in-memory mock (`src/data/areas.ts`). The API (`server/api`) has no routes
beyond `/health`. This spec covers building the missing API surface and
wiring the client to it, replacing the mock data end to end.

## Decisions

- **Action Log**: dropped from the Area detail screen for now. No
  Action/ActionLog management UI exists anywhere in the app (no way to
  create an Action with a frequency label), so there is nothing real to back
  the feed with. Action/ActionLog stay unused in this pass.
- **Seed data**: none. The database starts empty; a Create Area screen is
  built instead so real data can be added through the UI.
- **Client fetching**: plain `fetch` + a small typed API client + one
  reusable loading/error hook. No new dependencies (no react-query).
- **Accent color**: not stored in the DB (no `accent` column on `Area`).
  Derived client-side by sorting areas by `createdAt` ascending and indexing
  into the existing `AreaAccentPalette` (mod length), matching the palette's
  documented "assigned in creation order" intent in `theme/tokens.ts`.
- **Auth**: still none. A single user is lazily found-or-created server-side
  (no separate seed script to remember to run).

## Out of scope (unchanged from current UI)

- Action / ActionLog persistence.
- Archiving an Area, an Action, or a Goal.
- "Mark goal complete → prompt next goal" flow (no button for it exists).
- Goal history (only the single active goal is shown/edited).
- Any auth/login UI.

## API design (`server/api`)

### Current-user provisioning

`src/lib/currentUser.ts`: `getCurrentUserId(): Promise<string>` — finds the
first `User` row; if none exists, creates one with a fixed dev email
(`dev@spiral.local`). Memoized in module scope after the first successful
lookup (single-process dev server, restart is cheap enough to not need
cross-request caching beyond that).

### Routes

All routes scoped to the current user's areas; 404 if an `:id` doesn't
resolve to a non-archived area owned by that user.

```
GET    /areas
  → [{ id, name, description, importance, createdAt,
       activeGoal: { id, name, description, targetDate, status } | null,
       loggedToday: boolean }], sorted by importance desc

POST   /areas
  body: { name, description?, importance }
  → 201, created area (activeGoal: null, loggedToday: false)

GET    /areas/:id
  → single area, same shape as list items

PATCH  /areas/:id
  body: { name?, description?, importance? }
  → updated area

PUT    /areas/:id/goal
  body: { name, description?, targetDate? }
  → upserts the area's current active goal (creates one with
    status=active if none exists yet; otherwise updates the existing
    active goal's fields in place)
  → { id, name, description, targetDate, status }

GET    /areas/:id/daily-reviews
  → [{ id, date, answers: { madeProgress, whatHelped, notes } }],
    newest first

POST   /areas/:id/daily-reviews
  body: { madeProgress: boolean, whatHelped: string, notes?: string }
  → upserts today's review (unique on areaId+date — re-submitting the
    same day updates in place instead of erroring)
  → 200/201, the review

GET    /areas/:id/weekly-reflections
  → [{ id, weekStartDate, answers: WeeklyAnswers }], newest first

POST   /areas/:id/weekly-reflections
  body: WeeklyAnswers (wentWell, couldBeBetter, prevented, differently,
        proudOf)
  → upserts this week's reflection (week start = Monday of the current
    week, computed server-side, same algorithm as the client's
    formatWeekRangeLabel)
  → 200/201, the reflection
```

### Validation

Hand-written checks (no new validation library):
- `name`: required, non-empty, trimmed.
- `importance`: integer 1–10.
- `targetDate`: if present, valid `YYYY-MM-DD`.
- Malformed/missing required fields → `400 { error: string }`.
- Unknown/archived `:id` → `404 { error: string }`.

### Error handling

Route handlers are thin; unexpected errors fall through to the existing
`errorHandler` middleware (500 + logged via pino). No silent failures.

### Date handling

"Today" and "this week's Monday" are computed from the API server's local
time (`new Date()`, truncated to a date-only value for Postgres `@db.Date`
columns). Single dev server, single user, no timezone requirement stated —
not worth adding a timezone library for.

## Client design (`apps/mobile-web`)

### `src/lib/api.ts`

Expands from the current single `API_URL` constant into a typed client:

- A private `request<T>(path, options)` helper: builds the URL from
  `API_URL`, sets JSON headers, throws an `ApiError` (with status + message
  parsed from the response body) on non-OK responses.
- Typed domain types: `AreaSummary`, `Goal`, `DailyReview`, `WeeklyReflection`.
- Functions: `getAreas`, `createArea`, `getArea`, `updateArea`, `saveGoal`,
  `getDailyReviews`, `saveDailyReview`, `getWeeklyReflections`,
  `saveWeeklyReflection`.

### `src/hooks/useAsync.ts`

Generic hook: `useAsync(fn, deps) → { data, loading, error, refetch }`.
Used by every screen that reads from the API, so loading/error handling
isn't reimplemented per screen.

### Accent color

`src/lib/accent.ts`: `getAreaAccent(areas: AreaSummary[], areaId: string): string`
— sorts by `createdAt` ascending, finds the index, indexes into
`AreaAccentPalette` mod length.

### Screen changes

- **`app/index.tsx` (Dashboard)** + **`components/layout/Sidebar.tsx`**:
  fetch via `useAsync(getAreas)`. Dashboard shows a loading state, an error
  state with retry, and — when the list is empty — an empty state with a
  "Create your first Area" button linking to `/area/new`.
- **`app/area/new.tsx` (new)**: form (Name, Description, Importance) reusing
  `Field`/`TextField`/`TextArea`, same layout as Edit Area. On submit, calls
  `createArea`, then routes to `/area/:id/goal-edit` to set the first goal.
- **`app/area/[id]/index.tsx` (Area detail)**: fetches the area via
  `useAsync(() => getArea(id), [id])`. Action Log section removed. If
  `activeGoal` is null, the Goal card is replaced with a "No active goal
  yet — set one" prompt linking to Goal Edit.
- **`app/area/[id]/edit.tsx`**: Save calls `updateArea`, disables the button
  and shows "Saving…" while in flight, shows an inline error on failure,
  then navigates back to the detail screen on success.
- **`app/area/[id]/goal-edit.tsx`**: works whether or not `activeGoal`
  exists (empty fields if not). Save calls `PUT .../goal` regardless —
  same call handles both create and edit.
- **`app/area/[id]/daily-review.tsx`**: Save calls `saveDailyReview` with
  the three fields, same disabled/error/navigate pattern.
- **`app/area/[id]/history.tsx`**: fetches both daily-review and
  weekly-reflection lists via `useAsync`; renders whichever tab is active.
- **`app/weekly-reflection.tsx`**: fetches areas via `useAsync(getAreas)`
  for the chip row; Save calls `saveWeeklyReflection` for the selected
  area.
- **`components/ui/Button.tsx`**: gains an optional `disabled?: boolean`
  prop (dims + ignores presses) for the in-flight save state.
- **`data/areas.ts`**: deleted. `WEEKLY_QUESTIONS` (static prompt labels,
  not data) moves to `src/data/weeklyQuestions.ts`.
- **`hooks/useActiveArea.ts`**: replaced by the `useAsync(() => getArea(id))`
  calls directly in the screens that need it (it only ever wrapped a
  synchronous mock lookup; an async fetch doesn't fit the same shape, and
  each screen already needs its own loading/error state from `useAsync`).

## Verification plan

1. Typecheck + lint both workspaces (`npm run lint`, `tsc --noEmit` where
   applicable).
2. Start Postgres (`docker compose up -d`, already running), run/confirm
   the Prisma migration, start the API (`npm run dev:api`) and the Expo web
   build (`npm run dev:mobile`, press `w`).
3. Drive the app in a browser: create an Area → set its first goal → confirm
   the detail screen renders it → log a daily review → confirm "logged
   today" flips on the dashboard card → check Review History shows it →
   submit a weekly reflection → confirm it shows in history's weekly tab →
   edit the Area and the Goal and confirm changes persist across a refresh.
4. Fix anything that breaks before reporting done.

## Commit plan

Small, logical units, roughly:
1. Commit the pre-existing untracked Prisma migration (infra, predates this
   work).
2. API: current-user helper.
3. API: Area routes (list/create/get/update).
4. API: Goal upsert route.
5. API: Daily review routes.
6. API: Weekly reflection routes.
7. Client: typed API client (`lib/api.ts`) + `useAsync` hook.
8. Client: accent color helper + `Button` disabled prop.
9. Client: Dashboard + Sidebar wired to API (with empty state).
10. Client: Create Area screen.
11. Client: Area detail wired to API (Action Log removed, no-goal state).
12. Client: Edit Area wired to API.
13. Client: Goal Edit wired to API (create + edit).
14. Client: Daily Review wired to API.
15. Client: History wired to API.
16. Client: Weekly Reflection wired to API.
17. Cleanup: remove `data/areas.ts` mock and `useActiveArea` hook.
