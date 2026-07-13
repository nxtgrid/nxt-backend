# ADR-006: Monorepo Tooling & CI/CD

**Date:** 2026-07-07
**Status:** Accepted (initial baseline; several items explicitly deferred — see "Deferred" section)

---

## Context

ADR-004 confirmed one monorepo (apps + libs + `supabase/`) with a target of two runtime hosts — `api`
and `worker` — and mandated a type-drift guard as a CI gate. ADR-008 decided on a re-scaffold
(fresh modern Nx workspace) as the migration strategy. ADR-009 established operator-controlled
migration governance. This ADR decides everything below those commitments: the concrete toolchain,
build executor, caching strategy, CI pipeline shape, and deployment baseline.

### Inherited constraints

- One monorepo is confirmed; two default hosts: **`api`** (REST/WebSocket) and **`worker`**
  (background/collector capabilities, config-driven composition, single deployable by default).
- Migrations are canonical; a CI job must regenerate types from a clean migrated DB and fail on diff.
- Single-track open source: the pipeline must be runnable/forkable by external contributors without
  proprietary infrastructure.
- Fresh scaffold (ADR-008): each decision here applies to the new workspace, not patched onto the old.

### Clean-slate principle

The fresh scaffold adopts current, idiomatic tooling on its own merits. Prior workarounds
(`npm-force-resolutions` preinstall, the `resolutions` field, the gitignored `package-lock.json`)
were compatibility hacks and carry **zero forward weight** — they are not evidence for any choice and
are dropped, not ported. Where a real version pin is still needed, it is expressed idiomatically
(`pnpm.overrides`).

---

## Decisions

### 1. Monorepo tool: Nx 23 with full-modern layout

**Stay on Nx.** Nx's affected-graph + task caching is the right tool for the "migration → regenerate
types → typecheck 120+ consumers atomically" driver that motivated the monorepo (ADR-004 decision 2).
Turborepo and bare npm workspaces offer no equivalent affected-graph awareness for this use case.

**Fresh scaffold at Nx 23.0.2 (latest stable) with the full-modern layout:**

- **Project Crystal / inferred targets** (`@nx/webpack/plugin`, `@nx/jest/plugin`,
  `@nx/eslint/plugin` in `nx.json`). Per-project `project.json` files collapse to name + tags +
  overrides only.
- **TS-solution / package-based layout.** Each app and lib gets its own `package.json` with
  `@nxt/<name>` scoped name, wired via pnpm `workspace:*` protocol and TypeScript project references.
  Imports use package names (`@nxt/core`) rather than tsconfig path aliases (`@core`). This enforces
  capability boundaries at the module-graph level: a package can only import what it explicitly
  declares.
- `useProjectJson` flips off for apps in a TS-solution workspace; configuration is inlined into each
  project's `package.json`.

**Achieved via re-scaffold (not `nx migrate`).** A new `create-nx-workspace` workspace is created
at 23.0.2 and domain code is moved in per the ADR-008 Phase 3 process, preserving git history
where possible.

### 2. Package manager: pnpm (Corepack-pinned)

pnpm is adopted as the package manager for three reasons specific to this setup:

1. **Natural fit for TS-solution / package-based layout.** The `workspace:*` protocol wires internal
   `@nxt/*` packages cleanly and is first-class in Nx's package-based templates.
2. **Strict linking enforces capability boundaries.** pnpm's non-flat `node_modules` makes phantom
   dependencies impossible — a capability package can only import what it declares. This makes ADR-004
   capability seams a hard install-time guarantee, not just a lint convention.
3. **Content-addressed store** is fast and cache-friendly in CI.

pnpm is pinned via the `packageManager` field in the root `package.json` (Corepack). Contributors
activate it with `corepack enable` (ships with Node; no separate install).

**`pnpm-lock.yaml` is committed.** The lockfile is removed from `.gitignore`. Reproducible installs
are non-negotiable for cache correctness, type-drift guard accuracy, and Docker builds.

**`npm-force-resolutions` + `resolutions` are dropped entirely.** Any genuine pin is expressed as
`pnpm.overrides`.

### 3. Build executor: Nx NestJS template defaults

The `@nx/nest:application` generator at Nx 23.0.2 is accepted as-is:

- **Nest apps → `@nx/webpack` (`compiler: tsc`).** The Nx Nest generator hardcodes webpack with the
  comment "Some features require webpack plugins such as TS transformers." This is correct: NestJS
  relies on `emitDecoratorMetadata` and `experimentalDecorators`; esbuild cannot reliably emit these.
  webpack is not the "old default" to escape — it is the maintained, Nest-endorsed executor.
- **Libs → `tsc` project references.** In the TS-solution layout, buildable libs compile via
  `tsc -b`, giving true incremental builds.
- **Jest** for unit tests (with `@swc/jest` as the compiler for test speed, which the generator
  supports via `swcJest: true`).
- **ESLint flat config** (`eslint.config.ts`) — the generator produces this at 23.x; the stale
  `.eslintrc.cjs` reference in `nx.json` is dropped.

SWC as an app bundler compiler (`compiler: 'swc'` in webpack config) is left as a future opt-in if
build times become painful; it is not the baseline because it requires validation against the
decorator-metadata surface.

### 4. Node version: Node 24 LTS

Node 24 LTS ("Krypton") is adopted across all pinning surfaces:

| Surface | Value |
|---------|-------|
| `.nvmrc` | `v24` (or specific patch, e.g. `v24.0.0`) |
| `engines` in root `package.json` | `"node": "24.x"` |
| `packageManager` (Corepack) | `node@24.x.x` (resolved at scaffold time) |
| CI runner step | `uses: actions/setup-node@v4` with `node-version: '24'` |
| Docker base image | `node:24-slim` |

Rationale: fresh start on a new scaffold takes the newer active LTS (supported into 2028). All
significant native dependencies (`pg`, `mongodb`, `mqtt`, puppeteer for the legacy CALIN-v1 adapter)
support Node 24 by mid-2026.

### 5. Build efficiency: `affected` + local cache (baseline)

**`nx affected`** is the mechanism that delivers per-component rebuilds in CI. It computes which
projects changed (via git diff: base SHA vs head SHA, resolved by `nrwl/nx-set-shas`) and runs
the target only for those projects. This solves the "every push rebuilds all apps" problem at the CI
validation level.

**Local Nx cache is on by default** (free, no configuration). This is the baseline.

**Remote / CI caching is explicitly deferred.** It is not needed to get the `affected` benefit, and
all self-hosted remote-cache packages (`@nx/s3-cache`, `@nx/gcs-cache`, `@nx/azure-cache`,
`@nx/shared-fs-cache`) are deprecated as of 2026-05-21 (CVE-2025-36852, CREEP vulnerability — an
unpatchable design flaw). The forward path when caching is needed:

- **Option A (preferred):** `actions/cache` on `.nx/cache`, keyed by lockfile + source hash. Zero
  SaaS, zero server, works in forks.
- **Option B:** Nx Cloud (managed, free tier). Fork PRs without the token degrade to local cache
  gracefully. Opt-in for the canonical NXT repo only; never required for adopters.

### 6. Hosts and artifacts

Two host apps are scaffolded. The pipeline is generic over the set of hosts (not hardcoded):

| Host | Role |
|------|------|
| `api` | Request-handling: REST + WebSocket. Replaces `tiamat`. |
| `worker` | Background/collector: capabilities selected at boot by config. Replaces `loch` + `yeti`. |

`talos` is deprecated (CALIN-v1 hardware provisioning); its functionality folds into the metering
capability in the `api` host over time.

**Worker composition model.** `worker` is a single image whose active capabilities are determined
at boot from the operator's config (ADR-007 Tier-1 flags). To run functionally separate workers
(e.g. one for collectors, one for scheduled jobs), an operator runs the **same image twice with
different configs** — two process instances, two port assignments. This is a deployment/ops choice,
not a build target. No new Nx project is needed per logical worker.

**Local development.** `nx serve api` and `nx serve worker` are the development commands — identical
in feel to `nx serve tiamat` today. Chromium/Docker is not required for the inner loop; only
`supabase start` (local Postgres) is needed. For the two-logical-workers scenario locally:
`nx build worker --watch` in one terminal; `node dist/apps/worker/main.js` run twice with different
`NXT_CONFIG=` values.

### 7. Dockerfile (for future image-based deployment)

A single parameterized multi-stage Dockerfile is maintained to keep the image-based deploy path open:

```
ARG APP=api   # api | worker
```

Stages:

1. **base** — `node:24-slim` + Corepack + pnpm.
2. **build** — `pnpm install --frozen-lockfile` (BuildKit cache mount on the pnpm store) →
   `nx build ${APP}`.
3. **runtime** — `pnpm deploy --prod --filter=@nxt/${APP}` for a pruned `node_modules`, copy
   `dist/apps/${APP}`, run as a **non-root user** (`node`).

Base image rationale: `node:24-slim` (Debian slim) over Alpine — glibc avoids native-module
incompatibilities (`pg`, `mongodb`, `mqtt`). Distroless is a future hardening option; it complicates
the pnpm entrypoint and is not worth it for the baseline.

**Chromium is excluded from the default images.** The puppeteer/Chrome dependency is confined to the
legacy CALIN-v1 adapter in the deprecated `talos` app. If a CALIN-v1 adapter survives in the
metering capability, it is an optional image variant (a separate Dockerfile stage or a derived
image), never part of the lean `api`/`worker` defaults.

### 8. Deployment baseline: DigitalOcean from a GitHub branch

**Simple baseline: DO App Platform deploys directly from a GitHub branch.** DO builds the app using
either the buildpack (build command + run command) or a Dockerfile-in-repo. The specific build method
is left open and will be determined when the fresh scaffold lands.

Expected DO component configuration:

| Component | Build command | Run command |
|-----------|---------------|-------------|
| `api` | `pnpm install && nx build api` | `node dist/apps/api/main.js` |
| `worker` | `pnpm install && nx build worker` | `node dist/apps/worker/main.js` |

**Known tradeoff.** DO's branch-based builder has no Nx-graph awareness; it rebuilds broadly on
every push. The `affected` benefit from decision 5 applies to **CI validation only** (PR checks),
not to deploys. This tradeoff is accepted for simplicity at this stage.

**Image-based deploy path (deferred).** When per-component deploy rebuilds become worth the added
setup, the upgrade path is:

- CI: `nx affected -t docker-build` → push affected images to **GHCR** (tagged by semver + digest).
- DO: `registry_type: GHCR`, deploy by image digest via `digitalocean/app_action/deploy@v2`.
  Auto-redeploy is not supported from GHCR (DOCR-only); CI is the trigger.
- Versioning: unified semver tag per release (both `api` and `worker` share the same version);
  operators pin via image tag. Support policy: latest major only; maintenance branches created
  reactively if needed.

Note: DO explicitly supports GHCR as an image registry source (`registry_type: GHCR` in the app
spec).

### 9. CI pipeline (GitHub Actions)

**Platform:** GitHub Actions. Free for public repos; contributors get CI on forks without any
account setup; pairs with GHCR and the `digitalocean/app_action` natively.

#### PR checks workflow (`ci.yml`, triggers on pull_request)

```
1. checkout
2. corepack enable + pnpm install --frozen-lockfile
3. setup-node@v4 (Node 24)
4. nrwl/nx-set-shas (resolve base/head for affected)
5. nx affected -t lint test typecheck build --parallel=3
6. [conditional on supabase/** changes] schema type-drift guard (see below)
```

**Typecheck target** replaces the old global `tsc -p tsconfig.base.json --noEmit`. In the
TS-solution layout, each project runs `tsc -b` (project references, incremental). `nx affected -t
typecheck` runs only the projects that changed, which is faster and accurately scoped.

#### Schema type-drift guard (runs when `supabase/**` changes)

```
1. supabase start (pinned CLI version — see below)
2. npm run gen-types-local (or equivalent pnpm script)
3. npm run gen-better-types
4. git diff --exit-code libs/core/src/types/supabase-types.ts
```

The Supabase CLI version is pinned in `package.json` (`devDependencies`) and the lockfile, and is
not fetched via `npx supabase@latest` (which can silently upgrade). The script names will be updated
to their pnpm equivalents in the scaffold.

**CODEOWNERS** (`/.github/CODEOWNERS`) gates all `supabase/**` changes on a designated reviewer:

```
supabase/**  @bobbybol
```

Deferred schema CI additions: `squawk` migration linter, `db diff` PR comment.

#### Deploy workflow (`deploy.yml`, triggers on push to main / merge)

In the **current baseline** (branch-based DO deploy): DO handles deployment automatically on push;
no deploy step is needed in GHA beyond CI validation.

When the image-based path is adopted, this workflow builds and pushes affected images, then triggers
a DO deploy via `digitalocean/app_action/deploy@v2`.

### 10. Migration apply

Migration application is operator-controlled and never a side effect of `git push` (ADR-009).

**OSS default (now):** documented manual apply:

```bash
# Apply pending migrations to your database
npx supabase db push
# or
npx supabase migration up
```

**NXT private auto-apply:** NXT Grid's existing Supabase dashboard GitHub integration auto-apply
is a private operational choice and is not part of the product (ADR-009 decision 3).

**Deferred:** a `workflow_dispatch` apply job gated by a GitHub Environment protection rule
(manual approval required before apply). The workflow is specced in ADR-009 and will live in this
repo's `.github/workflows/` when implemented.

### 11. Lingering `nx` / high-CPU issue

The known issue of a lingering `nx` process consuming high CPU after `serve` is treated as
**resolved by the fresh Nx 23.0.2 scaffold**. The workaround note in `README.md` and the
`fix-node-cpu` script (`npm rebuild fsevents`) are removed. If the issue reappears on a specific
platform, it is filed as a bug against the scaffold — not documented as an expected quirk.

---

## Consequences

### Positive

- Full-modern Nx layout (Project Crystal + TS-solution) enforces capability boundaries at the
  package/module-graph level; no boundary drift over time.
- pnpm strict linking eliminates phantom dependencies; `pnpm-lock.yaml` committed = reproducible
  builds everywhere.
- `nx affected` in CI eliminates redundant rebuilds at the validation level from day one.
- Two-host model (`api` + `worker`) is lean, portable, and directly mirrors the target architecture.
- Dockerfile kept means the image-based deploy path is always one decision away, not a rearchitecture.
- Schema type-drift guard (pinned Supabase CLI) makes `supabase-types.ts` provably a function of
  the migrations at the same git ref.
- Clean-slate stack: no legacy hacks, no workarounds, no proprietary CI infra required.

### Negative / Risks

- Full-modern TS-solution layout + Nx 23 is newer and has less community Q&A than the classic
  `@core` path-alias style. Some rough edges may surface during the ADR-008 module import.
- DO branch-based builds have no graph awareness; deploys rebuild broadly until the image-based
  path is adopted.
- pnpm is slightly less universal than npm; contributors need `corepack enable` (one command,
  ships with Node 24).
- The two-pass module import (ADR-008 Phase 3) now also carries the `@nxt/*` import-path rename
  — more churn per module, but it only happens once and sets the final form.

---

## Deferred (options kept open, not rejected)

| Item | Trigger to revisit |
|------|--------------------|
| Remote / CI caching (GHA `actions/cache` or Nx Cloud) | Build times become a bottleneck |
| Image-based deploy (GHCR → DO by digest) | DO rebuild cost is worth eliminating |
| `nx release` / semver image tags | Image-based deploy is adopted |
| Maintenance/backport branches | A security fix is needed on an older major |
| `squawk` migration linter | Schema lane expands |
| `db diff` PR comment | Schema lane expands |
| Migration apply approval workflow (`workflow_dispatch` + GH Environment) | ADR-009 follow-up |
| SWC as webpack compiler (`compiler: 'swc'`) | App build times warrant it; validated against decorator-metadata |

## Rejected

- **`@nx/s3-cache`, `@nx/gcs-cache`, `@nx/azure-cache`, `@nx/shared-fs-cache`:** deprecated
  2026-05-21, CVE-2025-36852 (CREEP). Unpatchable design flaw; do not use in any new setup.
- **esbuild for Nest apps:** cannot reliably emit `emitDecoratorMetadata`; rejected for this
  codebase regardless of speed advantage.
- **Turborepo / npm workspaces:** weaker project-graph awareness; don't serve the
  "migration → types → typecheck 120+ consumers atomically" driver.
- **Yarn Berry:** most complexity, least payoff for this stack.

---

## Triggers (revisit when)

- App build times in CI exceed ~5 minutes consistently (remote caching / Nx Cloud).
- DO deploy cost (rebuilding everything) becomes a meaningful drag on iteration (image-based deploy).
- A capability resists the TS-solution import (signals a deeper coupling, own ADR).
- A second operator reports they need branch-based version targeting (revisit semver/image-tag model).

## Related

- **ADR-004** — monorepo decision, type-drift guard, two-host model, capability flags.
- **ADR-007** — config wiring (Tier-1 flags that drive worker composition at boot).
- **ADR-008** — re-scaffold strategy; this ADR defines the scaffold that Phase 1 proves.
- **ADR-009** — migration governance; the schema CI lane and apply pipeline specified there.
