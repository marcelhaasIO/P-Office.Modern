# Vercel + Supabase Deployment Runbook (Production)

## 1) Architecture
- App runtime: Vercel (Next.js / tRPC)
- Database/Auth-Data: Supabase PostgreSQL
- Realtime/Storage/Edge: Supabase services
- Migrations: Prisma against Supabase `DIRECT_URL`

## 2) Environment Variables
Set all values from `.env.vercel.example` in Vercel for `Preview` and `Production`.

Project reference already wired in templates: `lkpvuwogsoodmqdgisle`.

Important:
- `DATABASE_URL` = Supabase pooler URL (`:6543`, `pgbouncer=true`)
- `DIRECT_URL` = Supabase direct DB URL (`:5432`) for Prisma migrations

## 3) One-Time Project Bootstrap
1. Create Supabase project (region near CH users, e.g. eu-central).
2. Create Vercel project from this repository.
3. Add all environment variables to Vercel.
4. Verify `BETTER_AUTH_URL` matches the deployed domain.

## 4) Migration and Seed Flow
Use a machine with network access to Supabase and run from repo root:

```powershell
$env:DATABASE_URL="<supabase-pooled-url>"
$env:DIRECT_URL="<supabase-direct-url>"
corepack pnpm db:migrate:deploy
corepack pnpm db:seed
corepack pnpm db:migrate:status
```

Quick fill values for this project:

```powershell
$env:DATABASE_URL="postgresql://postgres.lkpvuwogsoodmqdgisle:<DB_PASSWORD>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
$env:DIRECT_URL="postgresql://postgres.lkpvuwogsoodmqdgisle:<DB_PASSWORD>@db.lkpvuwogsoodmqdgisle.supabase.co:5432/postgres"
corepack pnpm db:migrate:deploy
corepack pnpm db:seed
corepack pnpm db:migrate:status
```

For CI/CD, run `db:migrate:deploy` before promoting production release.

## 5) RLS and Safety Gates
- Keep RLS enabled on tenant/company tables.
- Never use service role key in browser code.
- Use service role key only in server actions, API routes, workers.
- Enforce closed-period and immutable-document triggers before finance go-live.

## 6) Vercel Deploy Sequence
1. Deploy to Preview.
2. Run smoke tests on Preview.
3. Run Prisma `db:migrate:deploy` against target environment.
4. Promote to Production.
5. Run post-deploy checks (auth, AV create, audit write).

## 7) Go-Live Checklist
- Migration status: no pending migrations.
- Seed baseline loaded (`Muster AG` for non-prod, customer tenant for prod).
- Auth login + company context verified.
- AV CRUD and audit trail verified.
- Realtime channels connected.
- Backup and PITR enabled in Supabase.
