# Spiral — Project Context

This file gives Claude Code full context on this project. Read it at the start of every session.

## Vision

This is a personal development app, built for personal use with the quality bar of a real
product (in case it's hosted for others later). It is explicitly **not** a habit tracker.

The app is built around **Areas of Development** — identities the user is continuously
growing (e.g. Developer, Athlete, Piano Player, Chess Player). Each Area has an active goal
and a set of concrete actions supporting that goal. When a goal is completed, it's archived
and a new goal replaces it. The identity persists; only the objective changes.

The central question the app asks is: **"Who do I want to become?"** — not "did you complete
your habit today?"

## Core Philosophy

- Areas of Development are the central concept — not tasks, not habits, not projects.
- Development is never "finished." Completing a goal means setting the next one.
- Reflection (daily + weekly) is a core mechanic, not an optional journal.
- v1 deliberately has **no scoring, no gamification, no streaks**. These were part of the
  original concept but are explicitly deferred — see "Deferred Features" below. Do not
  implement them unless asked.

## V1 Feature Scope

### Areas of Development

- Create / edit / archive an Area: name, description (optional), importance (1–10)
- List view of all active Areas, sorted by importance
- Detail view: current goal, actions, action log, links to review/reflection history

### Goals

- One **active** goal per Area at a time (name, description, target date — optional)
- Marking a goal complete archives it and prompts creation of the next goal in that Area
- Goal history view (archived/completed/abandoned goals per Area)
- Goal `status`: `active` | `completed` | `abandoned` (not just a boolean — abandoned goals
  happen in real use and shouldn't be hidden or forced into "completed")

### Actions

- Each Goal has a list of concrete actions: description + frequency label (free text, e.g.
  "daily" or "3x/week" — **no scheduling/calendar logic in v1**)
- Actions can be archived
- "Mark done today" creates an `ActionLog` entry (date + optional note)

### Daily Review

- Per Area, a short set of reflective prompts (e.g. "Did you make meaningful progress today?",
  "What did you do that made you better?") + free text
- Chronological history view per Area
- UI flow (single Area at a time vs. combined all-Areas view) — **not yet decided**, revisit
  with the user before building this screen

### Weekly Reflection

- Per Area, once a week: what went well / what could've gone better / what prevented
  progress / what will I do differently / what am I most proud of
- Chronological history view per Area

### Dashboard / Home

- All Areas sorted by importance
- Per-Area indicator: has today's review been logged? have actions been logged today?
- Quick-add entry point for today's review/action log

## Deferred Features (do not build unless explicitly requested)

These are real parts of the long-term vision but are out of scope until the core loop above
is built and in daily use:

- **Progress scoring** — per-Area score, bonus points for exceeding planned work, weighted
  scoring by achievement significance. Deliberately dropped from v1 due to Goodhart's-law
  risk (optimizing the score instead of actual growth) — revisit design carefully before
  adding.
- **Automatic scheduling** — generating a weekly practice schedule from Area importance +
  desired frequency.
- **Google Calendar sync.**
- **Multi-user auth** — schema should already have `userId` on every table (see Data Model),
  but login/session UI is deferred until hosting is actually planned.

## Design Direction

- Visual style: **dark, focused, "serious tool for serious work."** Not gamified, not
  playful, not point-driven.
- Each Area gets its own accent color (used sparingly — e.g. left border accent, small icon)
  against an otherwise dark, neutral UI.
- Clean typography, generous spacing, minimal chrome.
- Full mockups were designed in Claude Design — reference those designs for exact spacing,
  color values, and component styling when implementing screens.
- Screens (in build priority order): Dashboard → Area Detail → Area Create/Edit →
  Goal Create/Edit → Daily Review → Weekly Reflection.

## Tech Stack

- **Client:** React Native + Expo (single codebase targeting iOS, Android, and Web via
  `react-native-web`). Do not build separate native codebases.
- **Language:** TypeScript everywhere (client + server).
- **Server:** Node.js + Fastify (or Express), TypeScript. Note: the user is new to
  Node/Express (comes from an ASP.NET background) — favor clear, well-commented code and
  idiomatic patterns over clever/terse code, especially in the API layer.
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** Not implemented in v1. Every table includes a `userId` column from day one so the
  data model doesn't need to change when auth is added later. There is a single seeded user
  for now.

## Repo Structure

```
/apps
  /mobile-web   → Expo app (iOS, Android, Web)
/server
  /api          → Fastify + TypeScript
  /prisma       → schema.prisma, migrations
```

## Data Model (v1)

**User**

- id, email, createdAt

**Area**

- id, userId, name, description (nullable), importance (int, 1–10), createdAt,
  archivedAt (nullable — soft delete)

**Goal**

- id, areaId, name, description (nullable), targetDate (nullable), status
  (`active` | `completed` | `abandoned`), createdAt, completedAt (nullable)
- App-level rule: only one `active` Goal per Area at a time. Not enforced at the DB
  constraint level — enforce in application logic.

**Action**

- id, goalId, description, frequency (text label, free-form), createdAt,
  archivedAt (nullable — soft delete)

**ActionLog**

- id, actionId, date, note (nullable)
- One row per "I did this" event. This table is what will power streaks/frequency analytics
  and any future scoring — do not replace with a boolean flag on Action.

**DailyReview**

- id, areaId, date, answers (JSON — keep flexible so prompt questions can change without a
  migration), createdAt

**WeeklyReflection**

- id, areaId, weekStartDate, answers (JSON), createdAt

### Design notes for the schema

- `archivedAt` (soft delete) instead of hard delete on Area/Action — history needs to stay
  intact for any future analytics or scoring.
- `answers` as JSON on review/reflection tables rather than fixed columns — prompt questions
  are likely to be tuned over time.
- Every table has (or hangs off something with) `userId` so multi-user auth can be added
  later without restructuring.

## Working Conventions

- Prioritize clarity over cleverness — this is a learning project for the user in the
  Node/Express ecosystem.
- Keep v1 scope disciplined. If a request seems to reach into "Deferred Features," flag it
  rather than building it silently.
- Ask before making schema changes that would require a migration once real data exists.
