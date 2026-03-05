# Phase 1 Playwright critical path

## Scope
- Login (Better Auth)
- Company switch (tenant/company context)
- AV create address flow
- Audit log verification

## Run
1. Start application (`BASE_URL` must point to running app)
2. `pnpm --filter @po/e2e test`

If `BASE_URL` is missing, critical path tests are skipped intentionally.
