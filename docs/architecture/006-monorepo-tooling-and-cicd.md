# ADR-006: Monorepo Tooling & CI/CD

**Date:** 2026-06-26
**Status:** Open (deferred from ADR-004; to be resolved in a dedicated session)

---

## Purpose of this document

This is a **scoped stub** so the question can be picked up later in its own conversation with full
context. It records the problem, the current state, the options, and the constraints inherited from
ADR-004 — but does **not** yet make a decision.

## Inherited context (from ADR-004)

- One monorepo is confirmed (apps + libs + `supabase/`).
- Default runtime hosts: **`api`** and **`worker`**, with worker composition config-driven.
- Migrations are canonical; a CI job must **regenerate types from a clean migrated DB and fail on diff**.
- Single-track open source: the pipeline must be runnable/forkable by external contributors, not tied
  to NXT-only infrastructure.

## The question

Is the current monorepo tooling the right long-term choice, and how do we build/test/deploy
**efficiently** (only what changed) with working caching — locally and in CI?

## Current state (as observed)

- **Nx 21.2.2** monorepo, NestJS apps, **webpack** builds. TypeScript path aliases in
  `tsconfig.base.json` (`@core`, `@helpers`, `@timeseries`, `@tiamat`, etc.).
- **Every push rebuilds all apps**; Nx's `affected` graph and caching are **not** being leveraged at
  full rebuild.
- **CI/CD is effectively a stub:** `.github/workflows/deploy-to-do.yml` is almost entirely commented
  out; deployment targets **DigitalOcean App Platform**.
- **Known issue** (README): lingering `nx` process / high CPU after `serve`.
- The repo setup is relatively old; a from-scratch Nx workspace may differ significantly.

## Options to consider (not yet decided)

- **Keep Nx, fix configuration.** Adopt `nx affected` for build/test/lint, enable local + remote
  caching (Nx Cloud or self-hosted/S3-compatible cache), prune the project graph. Nx's core value
  proposition is exactly affected-graph + caching, so the current pain is likely misconfiguration, not
  a reason to leave.
- **Fresh Nx workspace.** Regenerate a modern Nx setup and migrate apps/libs in, shedding old config
  and the high-CPU issue.
- **Alternative tooling.** Evaluate Turborepo or plain npm workspaces + project references if Nx's
  weight is not justified for the OSS audience.
- **Build & deploy per host.** Produce per-host artifacts (Docker images for `api` and `worker`),
  build/deploy only affected hosts, and **decouple CI from DigitalOcean** so any operator can deploy
  (generic Docker / compose, with platform-specific guides layered on top).

## Constraints / evaluation criteria

- **Affected-only builds** and **working cache** (local + CI) are explicit goals.
- **Self-host/fork friendliness:** contributors must be able to run the pipeline without proprietary
  infra; avoid hard coupling to one cloud.
- **Type-generation guard** from ADR-004 must live in CI.
- Keep operator footprint small; prefer standard, portable artifacts (Docker/compose).

## To decide in the dedicated session

- Stay on Nx (fix vs fresh) or switch tooling.
- Concrete caching strategy (remote cache backend) and `affected` wiring.
- Per-host Docker build matrix and deployment that is cloud-agnostic by default.
- Replacement for the stubbed `deploy-to-do.yml`, including the migrations + type-drift CI gates.
- Implement the **schema CI lane** and the **opt-in, operator-controlled migration apply pipeline**
  specified in **ADR-009** (drift check, migration lint, `db diff` preview; no push-triggered prod apply).
- Resolution of the lingering-`nx`-process / high-CPU known issue.
