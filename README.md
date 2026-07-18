# NXT Backend

NestJS / Nx monorepo for a self-hostable mini-grid operations platform (Supabase Auth + Postgres,
optional Timescale for time-series).

## Status

**Foundation only — not feature-complete.** `main` currently ships the always-on Foundation from the
OSS migration (auth, API keys, accounts/members/organizations, user-admin, grids entity/seed, `api` +
`worker` hosts, canonical Supabase migrations). Capability domains (production monitoring, metering,
payments, notifications, field ops, automation) are **still being imported**; do not treat this tip
as a full replacement for the legacy multi-app stack.

- Migration roadmap: [`docs/plans/002-oss-migration.md`](docs/plans/002-oss-migration.md)
- Architecture ADRs: [`docs/architecture/`](docs/architecture/)
- Agent / maintainer commands: [`AGENTS.md`](AGENTS.md)
- Pre-migration tree (frozen reference): [`legacy/`](legacy/)

## Commands

```sh
pnpm install
pnpm exec supabase start          # local stack
pnpm exec supabase db reset       # migrations + seed
pnpm generate-types:local         # after schema changes
pnpm exec nx serve api            # or: worker
pnpm exec nx run-many -t lint typecheck build test -p api,worker,core
```

See `AGENTS.md` for the full command set and workflow.
