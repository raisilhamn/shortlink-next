# Shortlink

A URL shortener with click analytics. Built with Next.js, Drizzle ORM, Turso (SQLite), and NextAuth.

Public links expire in 7 days. Signed-in users get permanent links with full analytics (clicks by country, referrer, daily chart). Admin panel for moderation.

## Stack

- Next.js 16 (App Router)
- Drizzle ORM + Turso (SQLite)
- NextAuth v5 (Credentials provider)
- Tailwind CSS
- Zod
- Upstash Ratelimit

## Getting started

```bash
npm install
cp .env.example .env  # fill in your env vars
npm run dev
```

## Environment

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Turso database URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `AUTH_SECRET` | NextAuth secret |
| `INVITE_CODE` | Code required to register |
| `NEXT_PUBLIC_APP_URL` | Public base URL for short links |

## DB commands

```bash
npm run db:push     # push schema to Turso
npm run db:studio   # open Drizzle Studio
```

## Deploy

Deploy on Vercel. Add a KV store for rate limiting in production.
