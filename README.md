# Spiral

Personal development app built around Areas of Development. See `CLAUDE.md` for full
product and architecture context.

## Repo Structure

```
/apps
  /mobile-web   -> Expo app (iOS, Android, Web)
/server
  /api          -> Express + TypeScript API
  /prisma       -> schema.prisma, migrations
```

## Prerequisites

- Node.js 20+
- Docker (for local Postgres)

## Setup

```bash
npm install

# Start local Postgres
docker compose up -d

# Copy env files and generate the Prisma client
cp server/api/.env.example server/api/.env
cp apps/mobile-web/.env.example apps/mobile-web/.env
npm run --workspace server/api prisma:generate

# Create the database schema
npm run --workspace server/api prisma:migrate
```

## Running

```bash
# API - http://localhost:3000 (GET /health)
npm run dev:api

# Client - Expo dev server
npm run dev:mobile
```

## Quality checks

```bash
npm run lint
npm run format:check
```
