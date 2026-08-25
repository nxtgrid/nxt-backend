# NXT Backend

NestJS / Nx monorepo for a self-hostable mini-grid operations platform (Supabase Auth + Postgres,
optional Timescale for time-series).

## Status

**Foundation only — not feature-complete.** `main` currently ships the always-on Foundation from the
OSS migration (auth, API keys, accounts/members/organizations, user-admin, grids entity/seed, `api` +
`worker` hosts, canonical Supabase migrations). Capability domains (production monitoring, metering,
payments, notifications, field ops, automation) are **still being imported**; do not treat this tip
as a full replacement for the legacy multi-app stack.

When the **Metering** capability is enabled (ADR-007; not imported yet), meter commands go
through [`nxt-device-messaging`](https://github.com/nxtgrid/nxt-device-messaging) (sibling
`../nxt-device-messaging`): HTTP + webhook, same App Platform app, GHCR image. Types:
[`@nxtgrid/device-messaging-contract`](https://www.npmjs.com/package/@nxtgrid/device-messaging-contract).
Suite deploy: [`docs/deployment/digital-ocean-buildpack.md`](docs/deployment/digital-ocean-buildpack.md).
Without Metering, `api` / `worker` do not use that service.

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
