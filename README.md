# P-Office Modern

Cloud-first, multi-tenant ERP replacement for Swiss trades.

## Phase 1 Blueprint Included
- Monorepo structure
- Prisma baseline + migration order
- tRPC router contracts
- Seed data (Muster AG)
- Playwright critical path tests

## Quick Start
1. `pnpm install`
2. Copy `.env.example` to `.env`
3. `pnpm db:generate`
4. `pnpm db:migrate`
5. `pnpm db:seed`
6. `pnpm e2e`

## Production Target
- Hosting: Vercel
- Database/Auth-Data: Supabase PostgreSQL
- Deployment runbook: `docs/deployment/vercel-supabase.md`

## Vercel Import (First Deploy)
1. Import GitHub repo `marcelhaasIO/P-Office.Modern` in Vercel.
2. Keep framework `Next.js` and set Root Directory to `apps/web` (if prompted).
3. Add environment values from `.env.vercel.example`.
4. Deploy.

## Production DB Commands
- `pnpm db:migrate:deploy`
- `pnpm db:migrate:status`

## Local Test with Supabase (No Local Postgres)
1. Copy `.env.supabase.local.example` to `.env.supabase.local`.
2. Replace `[password]` and API key placeholders.
3. Run migrations:
	- `pwsh ./scripts/run-supabase-migrations.ps1`
4. Optionally run seed:
	- `pwsh ./scripts/run-supabase-migrations.ps1 -WithSeed`
5. Start app locally:
	- `corepack pnpm --filter @po/web dev`
