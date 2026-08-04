# API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile app's static mock data with real requests to the Express/Prisma API, building the missing API routes along the way, and add the one missing screen (Create Area) needed to make the wired-up app actually usable end to end.

**Architecture:** Express routes under `/areas` (list/create/get/update, nested goal/daily-review/weekly-reflection sub-resources) backed by Prisma, scoped to a single lazily-provisioned dev user (no auth in v1). The client gets a small typed `lib/api.ts` client plus one reusable `useAsync` loading/error hook; every screen that currently reads from `data/areas.ts` switches to calling the API through these two pieces.

**Tech Stack:** Express 4 + Prisma 6 (server, TypeScript/CommonJS), Expo Router + React Native (client, TypeScript). No new dependencies on either side.

## Global Constraints

- Full design context lives in `docs/superpowers/specs/2026-08-04-api-integration-design.md` — read it first if anything below is ambiguous.
- **No test framework exists in this repo** (checked: neither workspace has vitest/jest/supertest, no `*.test.ts` files anywhere). Do not add one as a side effect of this work. Each task's "Verify" step uses `curl` (API tasks) or typecheck/lint + a manual interaction check (client tasks) instead of automated tests, matching the spec's Verification Plan.
- **Do not run `git commit` inside Tasks 1–16.** Per explicit user instruction, all commits happen in Task 17 as one commit per logical unit. Task 17 lists the exact commit groupings.
- Follow existing code style exactly: no comments unless explaining genuinely non-obvious logic, `StyleSheet.create` co-located at the bottom of each component file, `@/` import alias, named exports (no default export except screen components, which Expo Router requires to default-export).
- Server module system is CommonJS with `import`/`export` syntax (see `server/api/tsconfig.json`) — matches the existing `routes/health.ts` style exactly.
- Client path alias `@/*` → `apps/mobile-web/src/*` (see `apps/mobile-web/tsconfig.json`).
- Postgres is already running locally (`docker compose up -d` already applied) and the initial migration is already applied to it — no new migration needed, the schema doesn't change in this plan.

---

### Task 1: API foundation + Area routes

**Files:**
- Create: `server/api/src/lib/currentUser.ts`
- Create: `server/api/src/lib/validation.ts`
- Create: `server/api/src/lib/asyncHandler.ts`
- Create: `server/api/src/lib/areas.ts`
- Create: `server/api/src/routes/areas.ts`
- Modify: `server/api/src/app.ts`

**Interfaces:**
- Produces: `getCurrentUserId(): Promise<string>`; `ValidationError` class; `requireNonEmptyString`, `optionalString`, `requireImportance`, `optionalDateOnly` validators; `asyncHandler(fn): RequestHandler`; `findOwnedArea(areaId, userId): Promise<Area | null>`; `serializeArea(area): Promise<AreaResponse>`; `serializeGoal(goal): GoalResponse`; `areasRouter` (Express `Router`) handling `GET/POST /areas`, `GET/PATCH /areas/:id`.
- Consumes: `prisma` from `server/api/src/lib/prisma.ts` (existing).

- [ ] **Step 1: Write `server/api/src/lib/currentUser.ts`**

```ts
import { prisma } from './prisma';

const DEV_USER_EMAIL = 'dev@spiral.local';

let cachedUserId: string | null = null;

export async function getCurrentUserId(): Promise<string> {
  if (cachedUserId) {
    return cachedUserId;
  }

  const existing = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (existing) {
    cachedUserId = existing.id;
    return existing.id;
  }

  const created = await prisma.user.create({ data: { email: DEV_USER_EMAIL } });
  cachedUserId = created.id;
  return created.id;
}
```

- [ ] **Step 2: Write `server/api/src/lib/validation.ts`**

```ts
export class ValidationError extends Error {}

export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

export function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`);
  }
  return value;
}

export function requireImportance(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10) {
    throw new ValidationError('importance must be an integer between 1 and 10');
  }
  return value;
}

export function optionalDateOnly(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${field} must be a YYYY-MM-DD date string`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} must be a valid date`);
  }
  return date;
}
```

- [ ] **Step 3: Write `server/api/src/lib/asyncHandler.ts`**

```ts
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { ValidationError } from './validation';

export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req, res, next: NextFunction) => {
    fn(req, res).catch((err: unknown) => {
      if (err instanceof ValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    });
  };
}
```

- [ ] **Step 4: Write `server/api/src/lib/areas.ts`**

```ts
import type { Goal, GoalStatus } from '@prisma/client';

import { prisma } from './prisma';

export interface GoalResponse {
  id: string;
  name: string;
  description: string | null;
  targetDate: string | null;
  status: GoalStatus;
}

export interface AreaResponse {
  id: string;
  name: string;
  description: string | null;
  importance: number;
  createdAt: string;
  activeGoal: GoalResponse | null;
  loggedToday: boolean;
}

export function serializeGoal(goal: Goal): GoalResponse {
  return {
    id: goal.id,
    name: goal.name,
    description: goal.description,
    targetDate: goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : null,
    status: goal.status,
  };
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export async function serializeArea(area: {
  id: string;
  name: string;
  description: string | null;
  importance: number;
  createdAt: Date;
}): Promise<AreaResponse> {
  const [activeGoal, todaysReview] = await Promise.all([
    prisma.goal.findFirst({ where: { areaId: area.id, status: 'active' } }),
    prisma.dailyReview.findUnique({
      where: { areaId_date: { areaId: area.id, date: startOfToday() } },
    }),
  ]);

  return {
    id: area.id,
    name: area.name,
    description: area.description,
    importance: area.importance,
    createdAt: area.createdAt.toISOString(),
    activeGoal: activeGoal ? serializeGoal(activeGoal) : null,
    loggedToday: Boolean(todaysReview),
  };
}

export async function findOwnedArea(areaId: string, userId: string) {
  return prisma.area.findFirst({
    where: { id: areaId, userId, archivedAt: null },
  });
}
```

- [ ] **Step 5: Write `server/api/src/routes/areas.ts`**

```ts
import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { findOwnedArea, serializeArea } from '../lib/areas';
import { getCurrentUserId } from '../lib/currentUser';
import { prisma } from '../lib/prisma';
import { optionalString, requireImportance, requireNonEmptyString } from '../lib/validation';

export const areasRouter = Router();

areasRouter.get(
  '/areas',
  asyncHandler(async (_req, res) => {
    const userId = await getCurrentUserId();
    const areas = await prisma.area.findMany({
      where: { userId, archivedAt: null },
      orderBy: { importance: 'desc' },
    });
    res.json(await Promise.all(areas.map(serializeArea)));
  }),
);

areasRouter.post(
  '/areas',
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId();
    const name = requireNonEmptyString(req.body.name, 'name');
    const description = optionalString(req.body.description, 'description');
    const importance = requireImportance(req.body.importance);

    const area = await prisma.area.create({
      data: { userId, name, description: description ?? null, importance },
    });
    res.status(201).json(await serializeArea(area));
  }),
);

areasRouter.get(
  '/areas/:id',
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId();
    const area = await findOwnedArea(req.params.id, userId);
    if (!area) {
      res.status(404).json({ error: 'Area not found' });
      return;
    }
    res.json(await serializeArea(area));
  }),
);

areasRouter.patch(
  '/areas/:id',
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId();
    const area = await findOwnedArea(req.params.id, userId);
    if (!area) {
      res.status(404).json({ error: 'Area not found' });
      return;
    }

    const name =
      req.body.name === undefined ? area.name : requireNonEmptyString(req.body.name, 'name');
    const description =
      req.body.description === undefined
        ? area.description
        : (optionalString(req.body.description, 'description') ?? null);
    const importance =
      req.body.importance === undefined ? area.importance : requireImportance(req.body.importance);

    const updated = await prisma.area.update({
      where: { id: area.id },
      data: { name, description, importance },
    });
    res.json(await serializeArea(updated));
  }),
);
```

- [ ] **Step 6: Wire `areasRouter` into `server/api/src/app.ts`**

Modify `server/api/src/app.ts` — add the import and register the router next to `healthRouter`:

```ts
import { areasRouter } from './routes/areas';
```

```ts
  app.use(healthRouter);
  app.use(areasRouter);
```

- [ ] **Step 7: Verify**

Run: `npm run --workspace server/api dev` (leave running in background), then in another shell:

```bash
curl -s http://localhost:3000/areas
# Expected: []

curl -s -X POST http://localhost:3000/areas \
  -H "Content-Type: application/json" \
  -d '{"name":"Developer","description":"Test area","importance":9}'
# Expected: 201, JSON with id, name "Developer", activeGoal: null, loggedToday: false

curl -s -X POST http://localhost:3000/areas \
  -H "Content-Type: application/json" -d '{"importance":9}'
# Expected: 400 {"error":"name is required"}

curl -s http://localhost:3000/areas
# Expected: array with the one created area
```

Keep the created area's `id` from the response — it's reused in Tasks 2–4's verification.

---

### Task 2: API — Goal upsert route

**Files:**
- Create: `server/api/src/routes/goals.ts`
- Modify: `server/api/src/app.ts`

**Interfaces:**
- Consumes: `asyncHandler`, `findOwnedArea`, `serializeGoal` (Task 1), `getCurrentUserId`, `optionalDateOnly`/`optionalString`/`requireNonEmptyString`.
- Produces: `goalsRouter` handling `PUT /areas/:id/goal`.

- [ ] **Step 1: Write `server/api/src/routes/goals.ts`**

```ts
import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { findOwnedArea, serializeGoal } from '../lib/areas';
import { getCurrentUserId } from '../lib/currentUser';
import { prisma } from '../lib/prisma';
import { optionalDateOnly, optionalString, requireNonEmptyString } from '../lib/validation';

export const goalsRouter = Router();

goalsRouter.put(
  '/areas/:id/goal',
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId();
    const area = await findOwnedArea(req.params.id, userId);
    if (!area) {
      res.status(404).json({ error: 'Area not found' });
      return;
    }

    const name = requireNonEmptyString(req.body.name, 'name');
    const description = optionalString(req.body.description, 'description');
    const targetDate = optionalDateOnly(req.body.targetDate, 'targetDate');

    const existingActiveGoal = await prisma.goal.findFirst({
      where: { areaId: area.id, status: 'active' },
    });

    const goal = existingActiveGoal
      ? await prisma.goal.update({
          where: { id: existingActiveGoal.id },
          data: { name, description: description ?? null, targetDate: targetDate ?? null },
        })
      : await prisma.goal.create({
          data: {
            areaId: area.id,
            name,
            description: description ?? null,
            targetDate: targetDate ?? null,
          },
        });

    res.json(serializeGoal(goal));
  }),
);
```

- [ ] **Step 2: Wire into `server/api/src/app.ts`**

```ts
import { goalsRouter } from './routes/goals';
```

```ts
  app.use(areasRouter);
  app.use(goalsRouter);
```

- [ ] **Step 3: Verify**

With the API still running and `<AREA_ID>` from Task 1's created area:

```bash
curl -s -X PUT http://localhost:3000/areas/<AREA_ID>/goal \
  -H "Content-Type: application/json" \
  -d '{"name":"Ship a personal project","targetDate":"2026-09-30","description":"End to end."}'
# Expected: 200, { id, name: "Ship a personal project", targetDate: "2026-09-30", status: "active" }

curl -s http://localhost:3000/areas/<AREA_ID>
# Expected: activeGoal now populated with the same goal

curl -s -X PUT http://localhost:3000/areas/<AREA_ID>/goal \
  -H "Content-Type: application/json" \
  -d '{"name":"Ship a personal project v2"}'
# Expected: 200, same goal id as before (updated in place, not a new row)
```

---

### Task 3: API — Daily review routes

**Files:**
- Create: `server/api/src/routes/dailyReviews.ts`
- Modify: `server/api/src/app.ts`

**Interfaces:**
- Consumes: `asyncHandler`, `findOwnedArea`, `startOfToday` (Task 1), `getCurrentUserId`, `ValidationError`.
- Produces: `dailyReviewsRouter` handling `GET/POST /areas/:id/daily-reviews`. Response item shape: `{ id, date: "YYYY-MM-DD", answers: { madeProgress: boolean, whatHelped: string, notes: string } }`.

- [ ] **Step 1: Write `server/api/src/routes/dailyReviews.ts`**

```ts
import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { findOwnedArea, startOfToday } from '../lib/areas';
import { getCurrentUserId } from '../lib/currentUser';
import { prisma } from '../lib/prisma';
import { ValidationError } from '../lib/validation';

export const dailyReviewsRouter = Router();

interface DailyReviewAnswers {
  madeProgress: boolean;
  whatHelped: string;
  notes: string;
}

function parseAnswers(body: unknown): DailyReviewAnswers {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }
  const { madeProgress, whatHelped, notes } = body as Record<string, unknown>;

  if (typeof madeProgress !== 'boolean') {
    throw new ValidationError('madeProgress must be a boolean');
  }
  if (typeof whatHelped !== 'string' || whatHelped.trim().length === 0) {
    throw new ValidationError('whatHelped is required');
  }
  if (notes !== undefined && typeof notes !== 'string') {
    throw new ValidationError('notes must be a string');
  }

  return {
    madeProgress,
    whatHelped: whatHelped.trim(),
    notes: (notes as string | undefined) ?? '',
  };
}

dailyReviewsRouter.get(
  '/areas/:id/daily-reviews',
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId();
    const area = await findOwnedArea(req.params.id, userId);
    if (!area) {
      res.status(404).json({ error: 'Area not found' });
      return;
    }

    const reviews = await prisma.dailyReview.findMany({
      where: { areaId: area.id },
      orderBy: { date: 'desc' },
    });

    res.json(
      reviews.map((review) => ({
        id: review.id,
        date: review.date.toISOString().slice(0, 10),
        answers: review.answers,
      })),
    );
  }),
);

dailyReviewsRouter.post(
  '/areas/:id/daily-reviews',
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId();
    const area = await findOwnedArea(req.params.id, userId);
    if (!area) {
      res.status(404).json({ error: 'Area not found' });
      return;
    }

    const answers = parseAnswers(req.body);
    const date = startOfToday();

    const review = await prisma.dailyReview.upsert({
      where: { areaId_date: { areaId: area.id, date } },
      update: { answers },
      create: { areaId: area.id, date, answers },
    });

    res.json({
      id: review.id,
      date: review.date.toISOString().slice(0, 10),
      answers: review.answers,
    });
  }),
);
```

- [ ] **Step 2: Wire into `server/api/src/app.ts`**

```ts
import { dailyReviewsRouter } from './routes/dailyReviews';
```

```ts
  app.use(goalsRouter);
  app.use(dailyReviewsRouter);
```

- [ ] **Step 3: Verify**

```bash
curl -s -X POST http://localhost:3000/areas/<AREA_ID>/daily-reviews \
  -H "Content-Type: application/json" \
  -d '{"madeProgress":true,"whatHelped":"Wrote the API routes","notes":"Good focus today"}'
# Expected: 200, review with today's date and the submitted answers

curl -s http://localhost:3000/areas/<AREA_ID>
# Expected: loggedToday: true

curl -s http://localhost:3000/areas/<AREA_ID>/daily-reviews
# Expected: array with exactly one review

curl -s -X POST http://localhost:3000/areas/<AREA_ID>/daily-reviews \
  -H "Content-Type: application/json" \
  -d '{"madeProgress":false,"whatHelped":"Updated answer","notes":""}'
curl -s http://localhost:3000/areas/<AREA_ID>/daily-reviews
# Expected: still exactly one review (upsert, not a second row), answers updated
```

---

### Task 4: API — Weekly reflection routes

**Files:**
- Create: `server/api/src/routes/weeklyReflections.ts`
- Modify: `server/api/src/app.ts`

**Interfaces:**
- Consumes: `asyncHandler`, `findOwnedArea`, `getCurrentUserId`, `ValidationError`.
- Produces: `weeklyReflectionsRouter` handling `GET/POST /areas/:id/weekly-reflections`. Response item shape: `{ id, weekStartDate: "YYYY-MM-DD", answers: { wentWell, couldBeBetter, prevented, differently, proudOf } }` (all strings).

- [ ] **Step 1: Write `server/api/src/routes/weeklyReflections.ts`**

```ts
import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { findOwnedArea } from '../lib/areas';
import { getCurrentUserId } from '../lib/currentUser';
import { prisma } from '../lib/prisma';
import { ValidationError } from '../lib/validation';

export const weeklyReflectionsRouter = Router();

interface WeeklyAnswers {
  wentWell: string;
  couldBeBetter: string;
  prevented: string;
  differently: string;
  proudOf: string;
}

const WEEKLY_ANSWER_KEYS: (keyof WeeklyAnswers)[] = [
  'wentWell',
  'couldBeBetter',
  'prevented',
  'differently',
  'proudOf',
];

function parseAnswers(body: unknown): WeeklyAnswers {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('Request body must be an object');
  }
  const record = body as Record<string, unknown>;
  const answers = {} as WeeklyAnswers;

  for (const key of WEEKLY_ANSWER_KEYS) {
    const value = record[key];
    if (typeof value !== 'string') {
      throw new ValidationError(`${key} must be a string`);
    }
    answers[key] = value;
  }

  return answers;
}

function startOfCurrentWeek(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday));
}

weeklyReflectionsRouter.get(
  '/areas/:id/weekly-reflections',
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId();
    const area = await findOwnedArea(req.params.id, userId);
    if (!area) {
      res.status(404).json({ error: 'Area not found' });
      return;
    }

    const reflections = await prisma.weeklyReflection.findMany({
      where: { areaId: area.id },
      orderBy: { weekStartDate: 'desc' },
    });

    res.json(
      reflections.map((reflection) => ({
        id: reflection.id,
        weekStartDate: reflection.weekStartDate.toISOString().slice(0, 10),
        answers: reflection.answers,
      })),
    );
  }),
);

weeklyReflectionsRouter.post(
  '/areas/:id/weekly-reflections',
  asyncHandler(async (req, res) => {
    const userId = await getCurrentUserId();
    const area = await findOwnedArea(req.params.id, userId);
    if (!area) {
      res.status(404).json({ error: 'Area not found' });
      return;
    }

    const answers = parseAnswers(req.body);
    const weekStartDate = startOfCurrentWeek();

    const reflection = await prisma.weeklyReflection.upsert({
      where: { areaId_weekStartDate: { areaId: area.id, weekStartDate } },
      update: { answers },
      create: { areaId: area.id, weekStartDate, answers },
    });

    res.json({
      id: reflection.id,
      weekStartDate: reflection.weekStartDate.toISOString().slice(0, 10),
      answers: reflection.answers,
    });
  }),
);
```

- [ ] **Step 2: Wire into `server/api/src/app.ts`**

```ts
import { weeklyReflectionsRouter } from './routes/weeklyReflections';
```

```ts
  app.use(dailyReviewsRouter);
  app.use(weeklyReflectionsRouter);
```

- [ ] **Step 3: Verify**

```bash
curl -s -X POST http://localhost:3000/areas/<AREA_ID>/weekly-reflections \
  -H "Content-Type: application/json" \
  -d '{"wentWell":"Shipped the API","couldBeBetter":"Started earlier","prevented":"Nothing","differently":"Nothing","proudOf":"Finishing the routes"}'
# Expected: 200, reflection with this week's Monday date

curl -s http://localhost:3000/areas/<AREA_ID>/weekly-reflections
# Expected: array with exactly one reflection

curl -s -X POST http://localhost:3000/areas/<AREA_ID>/weekly-reflections \
  -H "Content-Type: application/json" -d '{"wentWell":"x"}'
# Expected: 400 {"error":"couldBeBetter must be a string"}
```

Run `npm run --workspace server/api build` once to confirm the whole API workspace still typechecks cleanly, then stop the dev server (Ctrl+C) — it'll be restarted for the client verification pass later.

---

### Task 5: Client — typed API client + `useAsync` hook

**Files:**
- Modify: `apps/mobile-web/src/lib/api.ts`
- Create: `apps/mobile-web/src/hooks/useAsync.ts`

**Interfaces:**
- Produces: `ApiError` (has `status: number`), `getErrorMessage(error: unknown): string`, types `Goal`, `GoalStatus`, `AreaSummary`, `DailyReviewAnswers`, `DailyReview`, `WeeklyAnswers`, `WeeklyReflection`, and functions `getAreas`, `getArea`, `createArea`, `updateArea`, `saveGoal`, `getDailyReviews`, `saveDailyReview`, `getWeeklyReflections`, `saveWeeklyReflection`. Also `useAsync<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | null; loading: boolean; error: unknown; refetch: () => void }`.
- Consumes: nothing new (matches API response shapes from Tasks 1–4).

- [ ] **Step 1: Rewrite `apps/mobile-web/src/lib/api.ts`**

```ts
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type GoalStatus = 'active' | 'completed' | 'abandoned';

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  targetDate: string | null;
  status: GoalStatus;
}

export interface AreaSummary {
  id: string;
  name: string;
  description: string | null;
  importance: number;
  createdAt: string;
  activeGoal: Goal | null;
  loggedToday: boolean;
}

export interface DailyReviewAnswers {
  madeProgress: boolean;
  whatHelped: string;
  notes: string;
}

export interface DailyReview {
  id: string;
  date: string;
  answers: DailyReviewAnswers;
}

export interface WeeklyAnswers {
  wentWell: string;
  couldBeBetter: string;
  prevented: string;
  differently: string;
  proudOf: string;
}

export interface WeeklyReflection {
  id: string;
  weekStartDate: string;
  answers: WeeklyAnswers;
}

export function getAreas(): Promise<AreaSummary[]> {
  return request('/areas');
}

export function getArea(id: string): Promise<AreaSummary> {
  return request(`/areas/${id}`);
}

export function createArea(input: {
  name: string;
  description?: string;
  importance: number;
}): Promise<AreaSummary> {
  return request('/areas', { method: 'POST', body: JSON.stringify(input) });
}

export function updateArea(
  id: string,
  input: { name?: string; description?: string; importance?: number },
): Promise<AreaSummary> {
  return request(`/areas/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function saveGoal(
  areaId: string,
  input: { name: string; description?: string; targetDate?: string },
): Promise<Goal> {
  return request(`/areas/${areaId}/goal`, { method: 'PUT', body: JSON.stringify(input) });
}

export function getDailyReviews(areaId: string): Promise<DailyReview[]> {
  return request(`/areas/${areaId}/daily-reviews`);
}

export function saveDailyReview(areaId: string, input: DailyReviewAnswers): Promise<DailyReview> {
  return request(`/areas/${areaId}/daily-reviews`, { method: 'POST', body: JSON.stringify(input) });
}

export function getWeeklyReflections(areaId: string): Promise<WeeklyReflection[]> {
  return request(`/areas/${areaId}/weekly-reflections`);
}

export function saveWeeklyReflection(
  areaId: string,
  input: WeeklyAnswers,
): Promise<WeeklyReflection> {
  return request(`/areas/${areaId}/weekly-reflections`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
```

- [ ] **Step 2: Write `apps/mobile-web/src/hooks/useAsync.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fn()
      .then((data) => {
        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [...deps, reloadToken]);

  return { ...state, refetch };
}
```

- [ ] **Step 3: Verify**

Run: `npm run --workspace apps/mobile-web -- tsc --noEmit` (or `npx tsc --noEmit -p apps/mobile-web` from repo root).
Expected: no errors related to `lib/api.ts` or `hooks/useAsync.ts` (errors in screens that haven't been updated yet, e.g. `data/areas.ts` mismatches, are expected until later tasks — ignore those for this step).

---

### Task 6: Client — shared additions (accent color, Button disabled state, danger color token)

**Files:**
- Modify: `apps/mobile-web/src/theme/tokens.ts`
- Create: `apps/mobile-web/src/lib/accent.ts`
- Modify: `apps/mobile-web/src/components/ui/Button.tsx`

**Interfaces:**
- Produces: `Colors.danger`; `getAreaAccent(areas: AreaSummary[], areaId: string): string`; `Button` gains optional `disabled?: boolean`.
- Consumes: `AreaSummary`, `AreaAccentPalette` (existing).

- [ ] **Step 1: Add a danger color to `apps/mobile-web/src/theme/tokens.ts`**

In the `Colors` object, add one line after `textMuted`:

```ts
  textMuted: '#54585F',
  danger: '#E5484D',
```

- [ ] **Step 2: Write `apps/mobile-web/src/lib/accent.ts`**

```ts
import type { AreaSummary } from './api';
import { AreaAccentPalette } from '@/theme/tokens';

export function getAreaAccent(areas: AreaSummary[], areaId: string): string {
  const sorted = [...areas].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const index = sorted.findIndex((area) => area.id === areaId);
  if (index === -1) {
    return AreaAccentPalette[0];
  }
  return AreaAccentPalette[index % AreaAccentPalette.length];
}
```

- [ ] **Step 3: Add `disabled` support to `apps/mobile-web/src/components/ui/Button.tsx`**

Replace the full file:

```tsx
import { Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';

import { Colors, Fonts } from '@/theme/tokens';

interface ButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, isPrimary ? styles.primary : styles.secondary, disabled && styles.disabled]}
    >
      <Text style={isPrimary ? styles.primaryLabel : styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: Colors.text,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryLabel: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.bg,
  },
  secondaryLabel: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p apps/mobile-web`.
Expected: no new errors from these three files.

---

### Task 7: Client — Dashboard + Sidebar wired to the API

**Files:**
- Modify: `apps/mobile-web/src/app/index.tsx`
- Modify: `apps/mobile-web/src/components/layout/Sidebar.tsx`
- Modify: `apps/mobile-web/src/components/AreaCard.tsx`

**Interfaces:**
- Consumes: `useAsync`, `getAreas`, `getErrorMessage` (Task 5), `getAreaAccent` (Task 6), `Button` (Task 6).
- Produces: `AreaCard` now takes `{ area: AreaSummary; accent: string; onPress: () => void }` (was `{ area: MockArea; onPress }`).

- [ ] **Step 1: Rewrite `apps/mobile-web/src/components/AreaCard.tsx`**

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AreaSummary } from '@/lib/api';
import { Colors, Fonts } from '@/theme/tokens';

export function AreaCard({
  area,
  accent,
  onPress,
}: {
  area: AreaSummary;
  accent: string;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const importanceLabel = `${String(area.importance).padStart(2, '0')} / 10`;
  const todayGlyph = area.loggedToday ? '✓' : '○';
  const todayText = area.loggedToday ? 'Logged today' : 'Not yet today';

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.card,
        {
          borderLeftColor: accent,
          backgroundColor: hovered ? Colors.surfaceHover : Colors.surface,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={styles.name}>{area.name}</Text>
          <Text style={styles.importanceBadge}>{importanceLabel}</Text>
        </View>
        <View style={styles.rightGroup}>
          <Text style={styles.todayGlyph}>{todayGlyph}</Text>
          <Text style={styles.todayText}>{todayText}</Text>
        </View>
      </View>
      <Text style={styles.goalText}>
        {area.activeGoal ? area.activeGoal.name : 'No active goal yet'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  importanceBadge: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  todayGlyph: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    width: 14,
    textAlign: 'center',
  },
  todayText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textMuted,
  },
  goalText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    marginLeft: 20,
  },
});
```

- [ ] **Step 2: Rewrite `apps/mobile-web/src/app/index.tsx`**

```tsx
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AreaCard } from '@/components/AreaCard';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { getAreaAccent } from '@/lib/accent';
import { getAreas, getErrorMessage } from '@/lib/api';
import { formatTodayLabel } from '@/lib/date';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function DashboardScreen() {
  const router = useRouter();
  const { data: areas, loading, error, refetch } = useAsync(getAreas, []);

  return (
    <View style={sharedStyles.pageWrap}>
      <View style={styles.header}>
        <Text style={sharedStyles.eyebrow}>{formatTodayLabel()}</Text>
        <Text style={sharedStyles.h1}>Areas of Development</Text>
        <Text style={sharedStyles.subtitle}>Sorted by importance</Text>
      </View>

      {loading && <Text style={styles.status}>Loading areas…</Text>}

      {error && (
        <View style={styles.errorBlock}>
          <Text style={styles.errorText}>Couldn't load areas: {getErrorMessage(error)}</Text>
          <Button label="Retry" variant="secondary" onPress={refetch} />
        </View>
      )}

      {!loading && !error && areas && areas.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Areas yet</Text>
          <Text style={styles.emptyBody}>
            Areas of Development are the identities you're continuously growing.
          </Text>
          <Button label="Create your first Area" onPress={() => router.push('/area/new')} />
        </View>
      )}

      {!loading && !error && areas && areas.length > 0 && (
        <View style={styles.cardList}>
          {areas.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              accent={getAreaAccent(areas, area.id)}
              onPress={() => router.push(`/area/${area.id}`)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 36,
  },
  cardList: {
    gap: 10,
  },
  status: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorBlock: {
    gap: 12,
    alignItems: 'flex-start',
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.danger,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 8,
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'flex-start',
    gap: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyBody: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    maxWidth: 420,
  },
});
```

- [ ] **Step 3: Rewrite `apps/mobile-web/src/components/layout/Sidebar.tsx`**

`useAsync`'s deps include `pathname` so the sidebar's area list refreshes on every navigation — it's mounted once in the root layout and otherwise would never see areas created/edited after the first load.

```tsx
import { useRouter, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAsync } from '@/hooks/useAsync';
import { getAreaAccent } from '@/lib/accent';
import { getAreas } from '@/lib/api';
import { Colors, Fonts } from '@/theme/tokens';

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: areas } = useAsync(getAreas, [pathname]);
  const areaList = areas ?? [];

  const isDashboardActive = pathname === '/';
  const isWeeklyActive = pathname === '/weekly-reflection';

  return (
    <View style={styles.sidebar}>
      <View style={styles.logoRow}>
        <View style={styles.logoMark} />
        <Text style={styles.logoText}>Spiral</Text>
      </View>

      <Pressable
        onPress={() => router.push('/')}
        style={[styles.navRow, styles.navRowIndented, isDashboardActive && styles.navRowActive]}
      >
        <Text style={[styles.navText, isDashboardActive && styles.navTextActive]}>Dashboard</Text>
      </Pressable>

      <Text style={styles.navLabel}>Areas</Text>
      {areaList.map((area) => {
        const isActive = pathname.startsWith(`/area/${area.id}`);
        return (
          <Pressable
            key={area.id}
            onPress={() => router.push(`/area/${area.id}`)}
            style={[styles.navRow, isActive && styles.navRowActive]}
          >
            <View
              style={[styles.navDot, { backgroundColor: getAreaAccent(areaList, area.id) }]}
            />
            <Text style={[styles.navText, isActive && styles.navTextActive]}>{area.name}</Text>
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => router.push('/area/new')}
        style={[styles.navRow, styles.navRowIndented]}
      >
        <Text style={styles.navAddText}>+ Add Area</Text>
      </Pressable>

      <View style={styles.spacer} />

      <Pressable
        onPress={() => router.push('/weekly-reflection')}
        style={[styles.navRow, styles.navRowIndented, isWeeklyActive && styles.navRowActive]}
      >
        <Text style={[styles.navText, isWeeklyActive && styles.navTextActive]}>
          Weekly Reflection
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    minWidth: 260,
    backgroundColor: Colors.sidebarBg,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  logoMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.text,
  },
  logoText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  navLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    paddingTop: 18,
    paddingBottom: 6,
    paddingHorizontal: 10,
    marginLeft: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  navRowIndented: {
    marginLeft: 8,
  },
  navRowActive: {
    backgroundColor: Colors.surface,
  },
  navDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
  },
  navText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  navAddText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textMuted,
  },
  navTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
});
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p apps/mobile-web`.
Expected: no errors from `index.tsx`, `Sidebar.tsx`, or `AreaCard.tsx` (screens not yet migrated will still error — that's expected until their own task).

---

### Task 8: Client — Create Area screen

**Files:**
- Create: `apps/mobile-web/src/app/area/new.tsx`

**Interfaces:**
- Consumes: `Field`, `TextField`, `TextArea`, `Button`, `BackLink` (existing), `createArea`, `ApiError`, `getErrorMessage` (Task 5).
- Produces: route `/area/new`.

- [ ] **Step 1: Write `apps/mobile-web/src/app/area/new.tsx`**

```tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { createArea, getErrorMessage } from '@/lib/api';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function CreateAreaScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState('5');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBackToDashboard = () => router.push('/');

  const handleSave = async () => {
    const importanceValue = Number(importance);
    if (name.trim().length === 0) {
      setError('Name is required');
      return;
    }
    if (!Number.isInteger(importanceValue) || importanceValue < 1 || importanceValue > 10) {
      setError('Importance must be a whole number between 1 and 10');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const area = await createArea({
        name: name.trim(),
        description: description.trim() || undefined,
        importance: importanceValue,
      });
      router.push(`/area/${area.id}/goal-edit`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <View style={sharedStyles.formWrap}>
      <BackLink label="← Dashboard" onPress={goBackToDashboard} />
      <Text style={[sharedStyles.h1, styles.title]}>Create Area</Text>
      <Text style={[sharedStyles.subtitle, styles.subtitle]}>
        Areas are identities you're continuously growing — not one-off projects.
      </Text>

      <Field label="Name">
        <TextField value={name} onChangeText={setName} placeholder="e.g. Developer" />
      </Field>

      <Field label="Description">
        <TextArea value={description} onChangeText={setDescription} placeholder="Optional" />
      </Field>

      <Field label="Importance">
        <View style={styles.importanceRow}>
          <TextField
            value={importance}
            onChangeText={setImportance}
            keyboardType="number-pad"
            width={80}
          />
          <Text style={styles.importanceHint}>
            1 = low priority · 10 = defining priority right now
          </Text>
        </View>
      </Field>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={sharedStyles.formActions}>
        <Button
          label={saving ? 'Creating…' : 'Create Area'}
          onPress={handleSave}
          disabled={saving}
        />
        <Button label="Cancel" variant="secondary" onPress={goBackToDashboard} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
  },
  importanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  importanceHint: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.danger,
    marginTop: 8,
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p apps/mobile-web`.
Expected: no errors from this file. Full interaction check happens in Task 16.

---

### Task 9: Client — Area detail wired to the API

**Files:**
- Modify: `apps/mobile-web/src/app/area/[id]/index.tsx`
- Modify: `apps/mobile-web/src/lib/date.ts`

**Interfaces:**
- Consumes: `useAsync`, `getArea`, `ApiError`, `getErrorMessage` (Task 5).
- Produces: `formatDateLabel(isoDate: string): string` added to `lib/date.ts`.

- [ ] **Step 1: Add `formatDateLabel` to `apps/mobile-web/src/lib/date.ts`**

Append to the existing file (don't remove `formatTodayLabel`/`formatWeekRangeLabel`):

```ts
export function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
```

- [ ] **Step 2: Rewrite `apps/mobile-web/src/app/area/[id]/index.tsx`**

The Action Log section is removed (no Action/ActionLog UI exists anywhere — see spec). The accent dot next to the area name is dropped since this screen only fetches the single area, not the full list needed to compute a stable accent index; the dot still appears on the Dashboard card and Sidebar row, which do have the full list.

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AreaNotFound } from '@/components/AreaNotFound';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useAsync } from '@/hooks/useAsync';
import { ApiError, getArea, getErrorMessage } from '@/lib/api';
import { formatDateLabel } from '@/lib/date';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function AreaDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: area, loading, error } = useAsync(() => getArea(id), [id]);

  if (loading) {
    return (
      <View style={sharedStyles.pageWrap}>
        <Text style={styles.status}>Loading area…</Text>
      </View>
    );
  }

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return <AreaNotFound onBack={() => router.push('/')} />;
    }
    return (
      <View style={sharedStyles.pageWrap}>
        <Text style={styles.errorText}>Couldn't load this area: {getErrorMessage(error)}</Text>
      </View>
    );
  }

  if (!area) {
    return null;
  }

  const importanceLabel = `${String(area.importance).padStart(2, '0')} / 10`;

  return (
    <View style={sharedStyles.pageWrap}>
      <BackLink label="← Dashboard" onPress={() => router.push('/')} />

      <View style={styles.headerRow}>
        <Text style={sharedStyles.h1}>{area.name}</Text>
        <Text style={styles.importanceBadge}>{importanceLabel}</Text>
        <View style={styles.headerSpacer} />
        <Text style={styles.inlineLink} onPress={() => router.push(`/area/${area.id}/edit`)}>
          Edit Area →
        </Text>
      </View>
      {area.description && <Text style={sharedStyles.description}>{area.description}</Text>}

      <SectionLabel>Current Goal</SectionLabel>
      {area.activeGoal ? (
        <View style={styles.goalCard}>
          <View style={styles.goalTopRow}>
            <View>
              <Text style={styles.goalName}>{area.activeGoal.name}</Text>
              {area.activeGoal.targetDate && (
                <Text style={styles.goalDate}>
                  Target: {formatDateLabel(area.activeGoal.targetDate)}
                </Text>
              )}
            </View>
            <Text
              style={styles.inlineLink}
              onPress={() => router.push(`/area/${area.id}/goal-edit`)}
            >
              Edit →
            </Text>
          </View>
          {area.activeGoal.description && (
            <Text style={styles.goalDesc}>{area.activeGoal.description}</Text>
          )}
        </View>
      ) : (
        <View style={styles.goalCard}>
          <Text style={styles.goalDesc}>No active goal yet.</Text>
          <View style={styles.setGoalAction}>
            <Button label="Set a Goal" onPress={() => router.push(`/area/${area.id}/goal-edit`)} />
          </View>
        </View>
      )}

      <View style={sharedStyles.actionRow}>
        <Button
          label="Log Today's Review"
          onPress={() => router.push(`/area/${area.id}/daily-review`)}
        />
        <Button
          label="Review History"
          variant="secondary"
          onPress={() => router.push(`/area/${area.id}/history`)}
        />
        <Button
          label="Weekly Reflection"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/weekly-reflection', params: { areaId: area.id } })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.danger,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  headerSpacer: {
    flex: 1,
  },
  importanceBadge: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  inlineLink: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 22,
    marginBottom: 36,
  },
  goalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalName: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  goalDate: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  goalDesc: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 480,
  },
  setGoalAction: {
    marginTop: 16,
  },
});
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p apps/mobile-web`.
Expected: no errors from this file or `lib/date.ts`.

---

### Task 10: Client — Edit Area wired to the API

**Files:**
- Modify: `apps/mobile-web/src/app/area/[id]/edit.tsx`

- [ ] **Step 1: Rewrite `apps/mobile-web/src/app/area/[id]/edit.tsx`**

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AreaNotFound } from '@/components/AreaNotFound';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { useAsync } from '@/hooks/useAsync';
import { ApiError, getArea, getErrorMessage, updateArea } from '@/lib/api';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function AreaEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: area, loading, error } = useAsync(() => getArea(id), [id]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (area) {
      setName(area.name);
      setDescription(area.description ?? '');
      setImportance(String(area.importance));
    }
  }, [area]);

  if (loading) {
    return (
      <View style={sharedStyles.formWrap}>
        <Text style={styles.status}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return <AreaNotFound onBack={() => router.push('/')} />;
    }
    return (
      <View style={sharedStyles.formWrap}>
        <Text style={styles.errorText}>Couldn't load this area: {getErrorMessage(error)}</Text>
      </View>
    );
  }

  if (!area) {
    return null;
  }

  const goBackToDetail = () => router.push(`/area/${area.id}`);

  const handleSave = async () => {
    const importanceValue = Number(importance);
    if (name.trim().length === 0) {
      setSaveError('Name is required');
      return;
    }
    if (!Number.isInteger(importanceValue) || importanceValue < 1 || importanceValue > 10) {
      setSaveError('Importance must be a whole number between 1 and 10');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await updateArea(area.id, {
        name: name.trim(),
        description: description.trim(),
        importance: importanceValue,
      });
      goBackToDetail();
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <View style={sharedStyles.formWrap}>
      <BackLink label={`← ${area.name}`} onPress={goBackToDetail} />
      <Text style={[sharedStyles.h1, styles.title]}>Edit Area</Text>

      <Field label="Name">
        <TextField value={name} onChangeText={setName} />
      </Field>

      <Field label="Description">
        <TextArea value={description} onChangeText={setDescription} />
      </Field>

      <Field label="Importance">
        <View style={styles.importanceRow}>
          <TextField
            value={importance}
            onChangeText={setImportance}
            keyboardType="number-pad"
            width={80}
          />
          <Text style={styles.importanceHint}>
            1 = low priority · 10 = defining priority right now
          </Text>
        </View>
      </Field>

      {saveError && <Text style={styles.errorText}>{saveError}</Text>}

      <View style={sharedStyles.formActions}>
        <Button label={saving ? 'Saving…' : 'Save Area'} onPress={handleSave} disabled={saving} />
        <Button label="Cancel" variant="secondary" onPress={goBackToDetail} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  title: {
    marginBottom: 22,
  },
  importanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  importanceHint: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.danger,
    marginTop: 8,
    marginBottom: 8,
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p apps/mobile-web`. Expected: no errors from this file.

---

### Task 11: Client — Goal Edit wired to the API (create + edit)

**Files:**
- Modify: `apps/mobile-web/src/app/area/[id]/goal-edit.tsx`

- [ ] **Step 1: Rewrite `apps/mobile-web/src/app/area/[id]/goal-edit.tsx`**

Works whether or not `area.activeGoal` exists — empty fields and "Set a Goal" heading when it doesn't, prefilled fields and "Edit Goal" heading when it does. Either way, Save calls the same `PUT .../goal` upsert.

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AreaNotFound } from '@/components/AreaNotFound';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { useAsync } from '@/hooks/useAsync';
import { ApiError, getArea, getErrorMessage, saveGoal } from '@/lib/api';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function GoalEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: area, loading, error } = useAsync(() => getArea(id), [id]);

  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (area?.activeGoal) {
      setName(area.activeGoal.name);
      setTargetDate(area.activeGoal.targetDate ?? '');
      setDescription(area.activeGoal.description ?? '');
    }
  }, [area]);

  if (loading) {
    return (
      <View style={sharedStyles.formWrap}>
        <Text style={styles.status}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return <AreaNotFound onBack={() => router.push('/')} />;
    }
    return (
      <View style={sharedStyles.formWrap}>
        <Text style={styles.errorText}>Couldn't load this area: {getErrorMessage(error)}</Text>
      </View>
    );
  }

  if (!area) {
    return null;
  }

  const goBackToDetail = () => router.push(`/area/${area.id}`);

  const handleSave = async () => {
    if (name.trim().length === 0) {
      setSaveError('Goal name is required');
      return;
    }
    if (targetDate.trim().length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate.trim())) {
      setSaveError('Target date must be in YYYY-MM-DD format');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await saveGoal(area.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        targetDate: targetDate.trim() || undefined,
      });
      goBackToDetail();
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <View style={sharedStyles.formWrap}>
      <BackLink label={`← ${area.name}`} onPress={goBackToDetail} />
      <Text style={[sharedStyles.h1, styles.title]}>
        {area.activeGoal ? 'Edit Goal' : 'Set a Goal'}
      </Text>

      <Field label="Goal Name">
        <TextField value={name} onChangeText={setName} />
      </Field>

      <Field label="Target Date">
        <TextField
          value={targetDate}
          onChangeText={setTargetDate}
          placeholder="YYYY-MM-DD"
          width={200}
        />
      </Field>

      <Field label="Description">
        <TextArea value={description} onChangeText={setDescription} />
      </Field>

      {saveError && <Text style={styles.errorText}>{saveError}</Text>}

      <View style={sharedStyles.formActions}>
        <Button label={saving ? 'Saving…' : 'Save Goal'} onPress={handleSave} disabled={saving} />
        <Button label="Cancel" variant="secondary" onPress={goBackToDetail} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  title: {
    marginBottom: 22,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.danger,
    marginTop: 8,
    marginBottom: 8,
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p apps/mobile-web`. Expected: no errors from this file.

---

### Task 12: Client — Daily Review wired to the API

**Files:**
- Modify: `apps/mobile-web/src/app/area/[id]/daily-review.tsx`

- [ ] **Step 1: Rewrite `apps/mobile-web/src/app/area/[id]/daily-review.tsx`**

The `dailyPrompt2` mock prefill field no longer exists — "What did you do that made you better?" starts blank.

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AreaNotFound } from '@/components/AreaNotFound';
import { BackLink } from '@/components/ui/BackLink';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { useAsync } from '@/hooks/useAsync';
import { ApiError, getArea, getErrorMessage, saveDailyReview } from '@/lib/api';
import { formatTodayLabel } from '@/lib/date';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

export default function DailyReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: area, loading, error } = useAsync(() => getArea(id), [id]);

  const [madeProgress, setMadeProgress] = useState(true);
  const [whatHelped, setWhatHelped] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={sharedStyles.formWrap}>
        <Text style={styles.status}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    if (error instanceof ApiError && error.status === 404) {
      return <AreaNotFound onBack={() => router.push('/')} />;
    }
    return (
      <View style={sharedStyles.formWrap}>
        <Text style={styles.errorText}>Couldn't load this area: {getErrorMessage(error)}</Text>
      </View>
    );
  }

  if (!area) {
    return null;
  }

  const goBackToDetail = () => router.push(`/area/${area.id}`);

  const handleSave = async () => {
    if (whatHelped.trim().length === 0) {
      setSaveError('This field is required');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await saveDailyReview(area.id, {
        madeProgress,
        whatHelped: whatHelped.trim(),
        notes: notes.trim(),
      });
      goBackToDetail();
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <View style={sharedStyles.formWrap}>
      <BackLink label={`← ${area.name}`} onPress={goBackToDetail} />

      <Text style={sharedStyles.h1}>Daily Review</Text>
      <Text style={sharedStyles.subtitle}>
        {formatTodayLabel()} · {area.name}
      </Text>

      <View style={styles.promptBlock}>
        <Text style={styles.promptLabel}>Did you make meaningful progress today?</Text>
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setMadeProgress(true)}
            style={[styles.toggle, madeProgress ? styles.toggleActive : styles.toggleInactive]}
          >
            <Text style={madeProgress ? styles.toggleActiveText : styles.toggleInactiveText}>
              Yes
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMadeProgress(false)}
            style={[styles.toggle, !madeProgress ? styles.toggleActive : styles.toggleInactive]}
          >
            <Text style={!madeProgress ? styles.toggleActiveText : styles.toggleInactiveText}>
              No
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.promptBlock}>
        <Text style={styles.promptLabel}>What did you do that made you better?</Text>
        <TextArea value={whatHelped} onChangeText={setWhatHelped} minHeight={84} />
      </View>

      <View style={styles.promptBlock}>
        <Text style={styles.promptLabel}>Anything else worth remembering?</Text>
        <TextArea value={notes} onChangeText={setNotes} placeholder="Optional notes" minHeight={56} />
      </View>

      {saveError && <Text style={styles.errorText}>{saveError}</Text>}

      <View style={sharedStyles.formActions}>
        <Button
          label={saving ? 'Saving…' : "Save Today's Review"}
          onPress={handleSave}
          disabled={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.danger,
    marginBottom: 8,
  },
  promptBlock: {
    marginBottom: 28,
  },
  promptLabel: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggle: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  toggleActive: {
    backgroundColor: Colors.text,
  },
  toggleInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleActiveText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.bg,
  },
  toggleInactiveText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p apps/mobile-web`. Expected: no errors from this file.

---

### Task 13: Client — History wired to the API

**Files:**
- Modify: `apps/mobile-web/src/app/area/[id]/history.tsx`

- [ ] **Step 1: Rewrite `apps/mobile-web/src/app/area/[id]/history.tsx`**

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AreaNotFound } from '@/components/AreaNotFound';
import { BackLink } from '@/components/ui/BackLink';
import { LogRow } from '@/components/ui/LogRow';
import { useAsync } from '@/hooks/useAsync';
import { ApiError, getArea, getDailyReviews, getErrorMessage, getWeeklyReflections } from '@/lib/api';
import { formatDateLabel, formatWeekRangeLabel } from '@/lib/date';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

type HistoryTab = 'daily' | 'weekly';

export default function ReviewHistoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<HistoryTab>('daily');

  const { data: area, loading: areaLoading, error: areaError } = useAsync(() => getArea(id), [id]);
  const { data: dailyReviews, loading: dailyLoading, error: dailyError } = useAsync(
    () => getDailyReviews(id),
    [id],
  );
  const {
    data: weeklyReflections,
    loading: weeklyLoading,
    error: weeklyError,
  } = useAsync(() => getWeeklyReflections(id), [id]);

  if (areaLoading) {
    return (
      <View style={sharedStyles.pageWrap}>
        <Text style={styles.status}>Loading…</Text>
      </View>
    );
  }

  if (areaError) {
    if (areaError instanceof ApiError && areaError.status === 404) {
      return <AreaNotFound onBack={() => router.push('/')} />;
    }
    return (
      <View style={sharedStyles.pageWrap}>
        <Text style={styles.errorText}>Couldn't load this area: {getErrorMessage(areaError)}</Text>
      </View>
    );
  }

  if (!area) {
    return null;
  }

  return (
    <View style={sharedStyles.pageWrap}>
      <BackLink label={`← ${area.name}`} onPress={() => router.push(`/area/${area.id}`)} />
      <Text style={sharedStyles.h1}>Review History</Text>

      <View style={styles.tabRow}>
        <Pressable onPress={() => setTab('daily')} style={styles.tab}>
          <Text style={[styles.tabText, tab === 'daily' && styles.tabTextActive]}>
            Daily Reviews
          </Text>
          <View style={[styles.tabIndicator, tab === 'daily' && styles.tabIndicatorActive]} />
        </Pressable>
        <Pressable onPress={() => setTab('weekly')} style={styles.tab}>
          <Text style={[styles.tabText, tab === 'weekly' && styles.tabTextActive]}>
            Weekly Reflections
          </Text>
          <View style={[styles.tabIndicator, tab === 'weekly' && styles.tabIndicatorActive]} />
        </Pressable>
      </View>

      {tab === 'daily' && (
        <View>
          {dailyLoading && <Text style={styles.status}>Loading…</Text>}
          {dailyError && (
            <Text style={styles.errorText}>
              Couldn't load reviews: {getErrorMessage(dailyError)}
            </Text>
          )}
          {dailyReviews && dailyReviews.length === 0 && (
            <Text style={styles.status}>No daily reviews logged yet.</Text>
          )}
          {dailyReviews?.map((review) => (
            <LogRow
              key={review.id}
              dateLabel={formatDateLabel(review.date)}
              text={review.answers.whatHelped}
            />
          ))}
        </View>
      )}

      {tab === 'weekly' && (
        <View>
          {weeklyLoading && <Text style={styles.status}>Loading…</Text>}
          {weeklyError && (
            <Text style={styles.errorText}>
              Couldn't load reflections: {getErrorMessage(weeklyError)}
            </Text>
          )}
          {weeklyReflections && weeklyReflections.length === 0 && (
            <Text style={styles.status}>No weekly reflections logged yet.</Text>
          )}
          {weeklyReflections?.map((reflection) => (
            <LogRow
              key={reflection.id}
              dateLabel={formatWeekRangeLabel(new Date(`${reflection.weekStartDate}T00:00:00Z`))}
              text={reflection.answers.wentWell}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.danger,
    marginTop: 8,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  tab: {
    paddingHorizontal: 4,
    paddingTop: 10,
    marginRight: 20,
  },
  tabText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textMuted,
    paddingBottom: 10,
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  tabIndicator: {
    height: 2,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: Colors.text,
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p apps/mobile-web`. Expected: no errors from this file.

---

### Task 14: Client — Weekly Reflection wired to the API

**Files:**
- Create: `apps/mobile-web/src/data/weeklyQuestions.ts`
- Modify: `apps/mobile-web/src/app/weekly-reflection.tsx`

The form fields become controlled state (`answers`) instead of the old `defaultValue` + remount-by-key trick, since Save now needs to read the current values. Switching areas resets the form to blank — this screen doesn't prefetch an existing in-progress reflection for the current week to prefill from; it's a deliberate simplification (re-submitting the same week upserts in place either way, per the API design).

- [ ] **Step 1: Write `apps/mobile-web/src/data/weeklyQuestions.ts`**

```ts
import type { WeeklyAnswers } from '@/lib/api';

export const WEEKLY_QUESTIONS: { key: keyof WeeklyAnswers; label: string }[] = [
  { key: 'wentWell', label: 'What went well this week?' },
  { key: 'couldBeBetter', label: 'What could’ve gone better?' },
  { key: 'prevented', label: 'What prevented progress?' },
  { key: 'differently', label: 'What will I do differently?' },
  { key: 'proudOf', label: 'What am I most proud of?' },
];
```

- [ ] **Step 2: Rewrite `apps/mobile-web/src/app/weekly-reflection.tsx`**

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextArea } from '@/components/ui/TextArea';
import { WEEKLY_QUESTIONS } from '@/data/weeklyQuestions';
import { useAsync } from '@/hooks/useAsync';
import { getAreaAccent } from '@/lib/accent';
import { getAreas, getErrorMessage, saveWeeklyReflection, type WeeklyAnswers } from '@/lib/api';
import { formatWeekRangeLabel } from '@/lib/date';
import { Colors, Fonts } from '@/theme/tokens';
import { sharedStyles } from '@/theme/sharedStyles';

const EMPTY_ANSWERS: WeeklyAnswers = {
  wentWell: '',
  couldBeBetter: '',
  prevented: '',
  differently: '',
  proudOf: '',
};

export default function WeeklyReflectionScreen() {
  const router = useRouter();
  const { areaId } = useLocalSearchParams<{ areaId?: string }>();
  const { data: areas, loading, error } = useAsync(getAreas, []);

  const [selectedAreaId, setSelectedAreaId] = useState(areaId ?? '');
  const [answers, setAnswers] = useState<WeeklyAnswers>(EMPTY_ANSWERS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAreaId && areas && areas.length > 0) {
      setSelectedAreaId(areas[0].id);
    }
  }, [areas, selectedAreaId]);

  if (loading) {
    return (
      <View style={sharedStyles.formWrap}>
        <Text style={styles.status}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={sharedStyles.formWrap}>
        <Text style={styles.errorText}>Couldn't load areas: {getErrorMessage(error)}</Text>
      </View>
    );
  }

  if (!areas || areas.length === 0) {
    return (
      <View style={sharedStyles.formWrap}>
        <Text style={sharedStyles.h1}>Weekly Reflection</Text>
        <Text style={sharedStyles.subtitle}>Create an Area first to log a reflection.</Text>
      </View>
    );
  }

  const selectedArea = areas.find((area) => area.id === selectedAreaId) ?? areas[0];

  const handleAreaChange = (nextId: string) => {
    setSelectedAreaId(nextId);
    setAnswers(EMPTY_ANSWERS);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveWeeklyReflection(selectedArea.id, answers);
      router.push(`/area/${selectedArea.id}`);
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <View style={sharedStyles.formWrap}>
      <Text style={sharedStyles.h1}>Weekly Reflection</Text>
      <Text style={sharedStyles.subtitle}>{formatWeekRangeLabel()}</Text>

      <View style={styles.chipRow}>
        {areas.map((area) => (
          <Chip
            key={area.id}
            label={area.name}
            accent={getAreaAccent(areas, area.id)}
            selected={area.id === selectedArea.id}
            onPress={() => handleAreaChange(area.id)}
          />
        ))}
      </View>

      {WEEKLY_QUESTIONS.map((question) => (
        <View key={question.key} style={styles.promptBlock}>
          <Text style={styles.promptLabel}>{question.label}</Text>
          <TextArea
            value={answers[question.key]}
            onChangeText={(text) => setAnswers((prev) => ({ ...prev, [question.key]: text }))}
          />
        </View>
      ))}

      {saveError && <Text style={styles.errorText}>{saveError}</Text>}

      <View style={sharedStyles.formActions}>
        <Button
          label={saving ? 'Saving…' : 'Save Reflection'}
          onPress={handleSave}
          disabled={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.danger,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 24,
    marginBottom: 32,
  },
  promptBlock: {
    marginBottom: 28,
  },
  promptLabel: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 10,
  },
});
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p apps/mobile-web`. Expected: no errors from this file or `data/weeklyQuestions.ts`.

---

### Task 15: Client — Cleanup (remove mock data and the old hook)

**Files:**
- Delete: `apps/mobile-web/src/data/areas.ts`
- Delete: `apps/mobile-web/src/hooks/useActiveArea.ts`

- [ ] **Step 1: Confirm nothing still imports them**

Run:
```bash
grep -rn "from '@/data/areas'" apps/mobile-web/src
grep -rn "from '@/hooks/useActiveArea'" apps/mobile-web/src
```
Expected: no output (Tasks 7–14 already migrated every consumer).

- [ ] **Step 2: Delete the two files**

```bash
rm apps/mobile-web/src/data/areas.ts apps/mobile-web/src/hooks/useActiveArea.ts
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p apps/mobile-web` — expect zero errors across the whole workspace now (this is the first point where the entire client typechecks clean end to end).

---

### Task 16: Full verification pass

No files change in this task — it's the "review if everything works" pass.

- [ ] **Step 1: Lint and typecheck both workspaces**

```bash
npm run lint
npx tsc --noEmit -p apps/mobile-web
npm run --workspace server/api build
```
Expected: all clean.

- [ ] **Step 2: Start everything**

```bash
docker compose up -d
npm run dev:api
```
In a second terminal:
```bash
npm run dev:mobile
```
Press `w` in the Expo terminal to open the web build in a browser.

- [ ] **Step 3: Drive the app in a browser and confirm each of the following**

1. Dashboard loads with an empty state and a "Create your first Area" button (DB starts empty).
2. Create an Area (name, description, importance) → redirected to Goal Edit for the new area.
3. Set a goal → redirected to Area detail → the goal card shows the name/date/description just entered.
4. Dashboard now shows the new Area card with the right importance badge and "Not yet today".
5. Sidebar shows the new Area under "Areas" with a colored dot.
6. Log a Daily Review → back on Area detail; Dashboard card now shows "Logged today" (loggedToday flips).
7. Open Review History → Daily Reviews tab shows the entry just logged.
8. Open Weekly Reflection (from the sidebar and from the Area detail button), fill in the five prompts, save → redirected to Area detail.
9. Review History → Weekly Reflections tab shows the entry just logged.
10. Edit the Area (name/description/importance) → change persists after navigating away and back.
11. Edit the Goal → change persists after navigating away and back.
12. Create a second Area → confirm both accent colors differ and stay stable across a page reload (order derived from `createdAt`, not display order).
13. Stop the API server (Ctrl+C) and reload the Dashboard → confirm an error state with a working "Retry" button appears (not a blank screen or crash).

- [ ] **Step 4: Fix anything broken**

If any check in Step 3 fails, fix the root cause in the relevant task's file before proceeding — do not move on with a known-broken flow.

---

### Task 17: Commit everything in small logical units

No new code — this is the deferred commit sweep. Run `git status` first to confirm exactly these paths are staged per commit (nothing stray gets swept in).

Note: `server/api/src/app.ts` is edited incrementally across Tasks 1–4, but since nothing is committed until this task, only the *first* commit that stages it (Step 3) will actually contain a diff — by the time Steps 4–6 run, `app.ts` is already fully committed and `git add` on it is a harmless no-op. Steps 4–6 still list it for clarity; each of those commits will in practice contain only its route file.

- [ ] **Step 1:** Commit the pre-existing untracked Prisma migration (predates this work, was never committed):
```bash
git add server/prisma/migrations
git commit -m "Add initial Prisma migration"
```

- [ ] **Step 2:** Commit the design spec and this plan:
```bash
git add docs/superpowers/specs/2026-08-04-api-integration-design.md docs/superpowers/plans/2026-08-04-api-integration.md
git commit -m "Add API integration design spec and implementation plan"
```

- [ ] **Step 3:** Commit Task 1 (API foundation + Area routes):
```bash
git add server/api/src/lib/currentUser.ts server/api/src/lib/validation.ts server/api/src/lib/asyncHandler.ts server/api/src/lib/areas.ts server/api/src/routes/areas.ts server/api/src/app.ts
git commit -m "Add Area API routes"
```

- [ ] **Step 4:** Commit Task 2 (Goal route):
```bash
git add server/api/src/routes/goals.ts server/api/src/app.ts
git commit -m "Add Goal upsert API route"
```

- [ ] **Step 5:** Commit Task 3 (Daily review routes):
```bash
git add server/api/src/routes/dailyReviews.ts server/api/src/app.ts
git commit -m "Add daily review API routes"
```

- [ ] **Step 6:** Commit Task 4 (Weekly reflection routes):
```bash
git add server/api/src/routes/weeklyReflections.ts server/api/src/app.ts
git commit -m "Add weekly reflection API routes"
```

- [ ] **Step 7:** Commit Task 5 (typed API client + hook):
```bash
git add apps/mobile-web/src/lib/api.ts apps/mobile-web/src/hooks/useAsync.ts
git commit -m "Add typed API client and useAsync hook"
```

- [ ] **Step 8:** Commit Task 6 (shared client additions):
```bash
git add apps/mobile-web/src/theme/tokens.ts apps/mobile-web/src/lib/accent.ts apps/mobile-web/src/components/ui/Button.tsx
git commit -m "Add accent color helper and Button disabled state"
```

- [ ] **Step 9:** Commit Task 7 (Dashboard + Sidebar):
```bash
git add apps/mobile-web/src/app/index.tsx apps/mobile-web/src/components/layout/Sidebar.tsx apps/mobile-web/src/components/AreaCard.tsx
git commit -m "Wire dashboard and sidebar to the API"
```

- [ ] **Step 10:** Commit Task 8 (Create Area screen):
```bash
git add apps/mobile-web/src/app/area/new.tsx
git commit -m "Add Create Area screen"
```

- [ ] **Step 11:** Commit Task 9 (Area detail):
```bash
git add apps/mobile-web/src/app/area/\[id\]/index.tsx apps/mobile-web/src/lib/date.ts
git commit -m "Wire area detail screen to the API"
```

- [ ] **Step 12:** Commit Task 10 (Edit Area):
```bash
git add apps/mobile-web/src/app/area/\[id\]/edit.tsx
git commit -m "Wire edit area screen to the API"
```

- [ ] **Step 13:** Commit Task 11 (Goal Edit):
```bash
git add apps/mobile-web/src/app/area/\[id\]/goal-edit.tsx
git commit -m "Wire goal edit screen to the API"
```

- [ ] **Step 14:** Commit Task 12 (Daily Review):
```bash
git add apps/mobile-web/src/app/area/\[id\]/daily-review.tsx
git commit -m "Wire daily review screen to the API"
```

- [ ] **Step 15:** Commit Task 13 (History):
```bash
git add apps/mobile-web/src/app/area/\[id\]/history.tsx
git commit -m "Wire review history screen to the API"
```

- [ ] **Step 16:** Commit Task 14 (Weekly Reflection):
```bash
git add apps/mobile-web/src/app/weekly-reflection.tsx apps/mobile-web/src/data/weeklyQuestions.ts
git commit -m "Wire weekly reflection screen to the API"
```

- [ ] **Step 17:** Commit Task 15 (cleanup):
```bash
git add -u apps/mobile-web/src/data/areas.ts apps/mobile-web/src/hooks/useActiveArea.ts
git commit -m "Remove mock area data and unused hook"
```

- [ ] **Step 18:** Run `git log --oneline -20` and `git status` to confirm a clean tree and the expected commit sequence.
