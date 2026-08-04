# Authentication Design

Date: 2026-08-04

## Problem

Spiral has no authentication. The API operates as a single lazily-created
seeded user (`server/api/src/lib/currentUser.ts`), and the app is about to
be publicly reachable at `spiral.marksa.nl`. This spec adds real
email/password auth with true multi-user data isolation and public signup.

## Decisions (confirmed with the user)

- **Multi-tenancy**: true isolation. Each account gets its own private
  Areas/Goals/reviews. The schema already scopes everything by `userId`
  (`Area.userId`, everything else hangs off `Area`) — this only changes
  *which* `userId` routes use, not the data model's shape.
- **Account creation**: public signup page. Anyone can register.
- **Session storage**: DB-backed session table + httpOnly cookie, not a
  stateless JWT — sessions need to be revocable (logout).
- **Explicitly not building** (deliberate v1 scope cut, not oversight):
  email verification (no email-sending infrastructure), password reset,
  login rate-limiting. All addable later without a data model change.

## Data model changes

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())

  areas    Area[]
  sessions Session[]
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

`token` is a separate random value from `id` (32 bytes hex via
`crypto.randomBytes`) — deliberately not reusing the cuid `id` as a bearer
secret, since cuids aren't designed as unguessable tokens.

Requires a new Prisma migration. The existing seeded dev user
(`dev@spiral.local`, no password — incompatible with the new required
`passwordHash`) and any test data get wiped as part of applying this on the
VPS; nothing real has been entered yet.

## Server design (`server/api`)

### New dependencies

- `bcryptjs` (+ `@types/bcryptjs`) — password hashing. Pure JS, no native
  compile step, matters for building on the VPS.
- `cookie-parser` (+ `@types/cookie-parser`) — reads the session cookie off
  incoming requests.

### `src/lib/auth.ts`

- `hashPassword(password): Promise<string>` — bcrypt, cost factor 12.
- `verifyPassword(password, hash): Promise<boolean>`.
- `DUMMY_PASSWORD_HASH` — a bcrypt hash computed once at module load from
  random bytes, used in the login route so a failed login always pays the
  bcrypt cost whether or not the email exists. Without this, response time
  alone would leak which emails are registered.
- `createSession(userId): Promise<{ token, expiresAt }>` — 30-day expiry.
- `getSessionUser(token): Promise<User | null>` — null if missing or
  expired.
- `deleteSession(token): Promise<void>`.

### `src/middleware/requireAuth.ts`

Reads the `spiral_session` cookie, resolves it via `getSessionUser`, and
either attaches `req.userId` and calls `next()`, or responds `401`. Declares
a `req.userId?: string` augmentation on Express's `Request` type. Not built
on the existing `asyncHandler` (that wrapper is for terminal handlers that
always send a response; this needs to call `next()`), so it uses a plain
`.then/.catch` chain instead of `async`/`await` at the Express boundary.

### `src/routes/auth.ts`

```
POST /auth/signup   { email, password } → 201, sets session cookie
POST /auth/login    { email, password } → 200, sets session cookie
POST /auth/logout   → 204, clears session cookie (no-op if already logged out)
GET  /auth/me        (requires auth)    → 200 { id, email }
```

Validation: email matched against a simple `^[^\s@]+@[^\s@]+\.[^\s@]+$`
pattern (format only — no verification email sent), password minimum 8
characters, no other complexity rules. Signup checks for an existing email
first (`409` if taken). Login and signup responses never include
`passwordHash`. Login failure and "no such user" return the identical `401
{ error: "Invalid email or password" }` — never reveal whether an email is
registered.

Cookie attributes: `httpOnly: true`, `sameSite: 'lax'`, `secure:
env.nodeEnv === 'production'` (so it still works over plain
`http://localhost` in dev), `path: '/'`, `expires` matching the session's
`expiresAt`.

### Wiring existing routes to real auth

`lib/currentUser.ts` is deleted. The four existing routers (`areasRouter`,
`goalsRouter`, `dailyReviewsRouter`, `weeklyReflectionsRouter`) each replace
their `const userId = await getCurrentUserId();` call with `const userId =
req.userId!;` (the `!` is safe — these routers are only ever reached after
`requireAuth` has already run and guaranteed the field, same convention
already used for `req.params.id!` elsewhere in this codebase). `app.ts`
applies `requireAuth` once, in front of all four routers together:

```ts
app.use(healthRouter);
app.use(authRouter);
app.use(requireAuth, areasRouter, goalsRouter, dailyReviewsRouter, weeklyReflectionsRouter);
app.use(notFoundHandler);
app.use(errorHandler);
```

### CORS

`config/env.ts` gains `corsOrigin` (from `CORS_ORIGIN` env var, defaulting
to `http://localhost:8083` for local dev). `app.ts`'s `cors()` call becomes
`cors({ origin: env.corsOrigin, credentials: true })` — needed because the
client's `fetch` calls now carry cookies (`credentials: 'include'`), and
browsers reject credentialed cross-origin requests against a wildcard
`Access-Control-Allow-Origin`. In production this is close to a no-op:
nginx reverse-proxies `/api/` under the same domain as the page
(`spiral.marksa.nl`), so the browser sees same-origin requests and CORS
headers aren't consulted at all. It only actually matters for local dev,
where the client (`localhost:8083`) and API (`localhost:3000`) are
different origins.

## Client design (`apps/mobile-web`)

### `src/lib/api.ts`

- `request()`'s `fetch` call gains `credentials: 'include'` so the
  httpOnly cookie is sent/received.
- New functions: `signup(email, password)`, `login(email, password)`,
  `logout()`, `getCurrentUser()`. All hit the new `/auth/*` routes.

### New screens

- `app/login.tsx` — email + password, submit → `login()` →
  `router.replace('/')` on success, inline error on failure. Link to
  `/signup`.
- `app/signup.tsx` — email + password, submit → `signup()` (which also logs
  the new user in) → `router.replace('/')`. Link to `/login`.

### Auth gating in `app/_layout.tsx`

On mount, calls `GET /auth/me` via `useAsync`. While that's pending, renders
a blank/loading state (no Sidebar, no flash of the wrong screen). Once
resolved:
- Not authenticated + not already on `/login` or `/signup` → redirect to
  `/login`.
- Authenticated + on `/login` or `/signup` → redirect to `/`.
- `/login` and `/signup` render full-viewport with no Sidebar (they're the
  pre-auth screens); every other route renders Sidebar + `Slot` as today,
  now knowing the user is authenticated.

### Logout

A "Log out" row added to the bottom of `Sidebar.tsx`, calling `logout()`
then `router.replace('/login')`.

### Accepted limitation

If a session expires *during* an active use of the app (30 days in, mid-
scroll), the user isn't proactively redirected to `/login` — the specific
screen they're on just shows its existing "Couldn't load: <error>" retry
state, since the request that discovers the 401 has already committed to
its own error handling. A global 401-interceptor-and-redirect is possible
but adds real complexity (wrapping every `useAsync` call site, or
centralizing state some other way) for an edge case that, at 30-day
sessions, will be rare. Not building it for v1.

## Deployment note

The VPS's `server/api/.env` needs a `CORS_ORIGIN` line added (harmless if
omitted, given the same-origin proxy setup, but worth being explicit):
`CORS_ORIGIN=https://spiral.marksa.nl`. `DEPLOY.md` gets a short addendum
covering this plus wiping the old seeded dev user via the new migration.

## Verification plan

1. Lint + typecheck both workspaces.
2. `curl`-level checks: signup, login (correct + wrong password), `/auth/me`
   with and without a session cookie, logout, and confirm a previously
   protected route (`GET /areas`) returns `401` with no cookie and `200`
   with one.
3. Confirm two different accounts each see only their own Areas (create
   Area under account A, log in as account B, confirm A's Area doesn't
   appear).
4. Browser walkthrough (manual, by the user, same constraint as the earlier
   API integration work — no working browser automation in this
   environment): sign up, get redirected to dashboard, log out, get
   redirected to login, log back in, hit `/login` while already
   authenticated and confirm it bounces to `/`.
