# 002c — Scaffold, Pipeline & Config Skeleton

**Parent plan:** `docs/plans/002-oss-migration.md` (read it first)
**Decisions:** ADR-006 (tooling/CI — this plan executes it), ADR-007 (config mechanism — this
plan builds the skeleton), ADR-008 (Phase 1: prove the golden path on hello-world before any
domain code lands)
**Created:** 2026-07-08
**Status:** Not started
**Depends on:** 002a (repo restructure) complete. Runs in **parallel** with 002b (database
baseline); Task 8 is the interlock where the two tracks join.
**Execution model:** collaborative — the maintainer may execute tasks manually with the agent
advising, or the agent may execute under maintainer review. Ask which mode applies before
starting a task; see "Division of labor" in the parent plan. (Existing per-task `Executor:`
notes mark where maintainer credentials/access are *required*; everywhere else the mode is
chosen per task.)

---

## Purpose

Stand up the fresh, modern workspace and prove the entire golden path —
`migration up → local DB → gen-types → typecheck → affected build → per-host Docker image →
deploy` — green in CI, on hello-world content, before any domain module is imported. Establish
the ADR-007 config loader/skeleton so every later capability plugs into one consistent
mechanism.

**Target stack (all decided in ADR-006 — do not relitigate here):**

| Concern | Decision |
|---|---|
| Monorepo tool | Nx **23.0.1** (or latest 23.x patch at execution time — record in decisions log), full-modern layout: Project Crystal inferred targets + TS-solution/package-based |
| Package naming | `@nxt/<name>` scoped packages, pnpm `workspace:*`, imports via package names (no path aliases) |
| Package manager | pnpm, Corepack-pinned via `packageManager`; **`pnpm-lock.yaml` committed** |
| Node | 24 LTS on all pinning surfaces (`.nvmrc`, `engines`, `packageManager`, CI, Docker) |
| Apps | `api` and `worker` via `@nx/nest` generator defaults (webpack + tsc, `swcJest: true`, ESLint flat config) |
| CI | GitHub Actions, `nx affected -t lint test typecheck build`, conditional schema type-drift lane |
| Deploy baseline | DO App Platform building from a GitHub branch (no graph awareness — accepted) |
| Dropped hacks | `npm-force-resolutions`, `resolutions`, gitignored lockfile, `fix-node-cpu` — zero forward weight, not ported |

## Current state snapshot (2026-07-08 — verify before executing)

- After 002a: repo root contains `docs/`, `legacy/`, `.github/`, `.gitignore`, `.cursor/`,
  `.vscode/`, `AGENTS.md`, license/contributor files — and `supabase/` once 002b Task 4 has
  run. No workspace files at root.
- Legacy stack (reference only, in `legacy/`): Nx 21.2.2, npm, Node 22, webpack, path-alias
  imports (`@core`, `@tiamat`, `@helpers`), `.eslintrc`-era config referenced from `nx.json`.
- Legacy root `.gitignore` ignores `package-lock.json` (the old hack). The new workspace needs
  `pnpm-lock.yaml` **tracked** — fix the ignore rules in Task 1.
- The legacy type-gen pipeline (to be re-established in Task 5):
  `supabase gen types typescript --local` → `better-supabase-types … --enumAsType` →
  `fix-supabase-json-type.js` → eslint-fix → output `libs/core/src/types/supabase-types.ts`.
  Source scripts: `legacy/package.json` + `legacy/.scripts/fix-supabase-json-type.js`.
- CI trigger note: the migration lives on the **`oss-migration`** branch (roadmap assumption
  6). Workflows trigger on PRs targeting that branch; `nrwl/nx-set-shas` gets
  `main-branch-name: oss-migration`. Both switch to `main` when the branch lands.

## Non-goals (deferred per ADR-006/007 — do not build)

- Remote/CI caching (`actions/cache` on `.nx/cache`, Nx Cloud) — local cache only.
- Image-based deploy (GHCR → DO by digest), `nx release`, semver image tags.
- `squawk` migration linter, `db diff` PR comment, migration-apply approval workflow.
- SWC as webpack compiler.
- ADR-007 deferred items: `NXT_CONFIG_URL` fetch implementation, generated JSON Schema,
  central capability registry, aggregated `MISSING` list, effective-config boot report,
  null/manual adapters. The resolver *design* leaves the URL slot open; only the slot is
  documented, not implemented.

---

## Task 1 — Scaffold the workspace at root

- [ ] **Status:** Not started
- **Depends on:** 002a complete

`create-nx-workspace` requires an empty directory; the repo root is not. Standard workaround:
generate into a temp dir, then move contents into the root.

```bash
npx create-nx-workspace@23.0.1 nxt-backend \
  --preset=ts --package-manager=pnpm --no-cloud   # exact flags: check the 23.x docs for the
                                                  # TS-solution preset name at execution time
# then move everything from the temp dir into the repo root (including dotfiles),
# merging .gitignore rather than overwriting it
```

Then pin all surfaces:

1. `.nvmrc` → `v24` (root; legacy keeps its own `v22.9.0` inside `legacy/`).
2. Root `package.json`: `engines.node: "24.x"`, `packageManager: "pnpm@<resolved>"` (Corepack).
3. `.gitignore`: merge scaffold output with the existing file; **remove any rule that ignores
   lockfiles**; ensure `legacy/` is *not* ignored (it is tracked reference) and that `.nx/`,
   `dist/`, `node_modules/` are ignored at any depth.
4. `pnpm-workspace.yaml`: packages `apps/*`, `libs/*` — verify `legacy/` matches no glob.
5. `corepack enable && pnpm install` → commit `pnpm-lock.yaml`.

**Done when:** `pnpm install` succeeds from a clean clone with only Corepack-shipped tooling;
`nx graph` runs; `git ls-files pnpm-lock.yaml` shows the lockfile tracked; nothing under
`legacy/` appears in the Nx project graph.

---

## Task 2 — Generate hosts and core lib (hello-world)

- [ ] **Status:** Not started
- **Depends on:** Task 1

1. `nx g @nx/nest:application apps/api` and `nx g @nx/nest:application apps/worker` — accept
   generator defaults (webpack + tsc, `swcJest: true`, flat ESLint). Package names `@nxt/api`,
   `@nxt/worker`.
2. `nx g @nx/js:library libs/core` (buildable, `tsc -b` project references) → `@nxt/core`.
3. Hello-world proof: `api` exposes `GET /health` returning name+version; `worker` boots,
   logs a heartbeat (e.g. `@nestjs/schedule` interval), and exposes nothing.
4. Confirm the TS-solution boundary mechanics: `@nxt/api` imports something trivial from
   `@nxt/core` **by package name**; an undeclared import (e.g. from `@nxt/worker`) must fail
   typecheck/install — try it once, then revert (record result).

**Done when:** `nx serve api` and `nx serve worker` both run; `nx run-many -t lint test
typecheck build` is green; the boundary probe behaved as expected.

---

## Task 3 — ADR-007 config skeleton in `@nxt/core`

- [ ] **Status:** Not started
- **Depends on:** Task 2

Build the config mechanism exactly as decided in ADR-007 (read it in full before this task):

1. **Zod schema** in `@nxt/core` (`config/schema.ts`): start minimal —
   `$schemaVersion: "1"`, `deployment { adminOrganizationId, systemWalletId }`,
   `public { platformName }`, `capabilities: {}`, `integrations: {}`. Fields grow with
   capability imports; do not speculate ahead.
2. **Loader** (`config/loader.ts`): resolve source by precedence
   `NXT_CONFIG_JSON` (inline) → *(URL slot: documented, not implemented)* →
   `NXT_CONFIG_PATH` (file) → bundled `config.default.json`; then
   `JSON.parse` → Zod `.parse()` (clear path-based errors; `$schemaVersion` mismatch rejects)
   → `Object.freeze` → `setConfig()`.
3. **Access:** global `getConfig()` / `setConfig()` (`config/index.ts`); `getConfig()` throws
   a clear error if called before load. No `@nestjs/config`, no DI token.
4. **Wiring pattern:** each app's `main.ts` loads config **before** `NestFactory.create`.
   Each app module composes `imports = [ ...alwaysOn, ...demoModules(config) ]` — include one
   trivial **demo capability contribution function** proving Tier-1 gating: flag off (default)
   → module not instantiated; flag on → module loads; flag on + its declared env var missing
   → boot blocks with `MISSING …` (honesty rule, fail-fast). Provide the co-located
   `requireEnv`-style helper the demo uses — this is the pattern every adapter copies later.
5. **Artifacts:** `config.example.json` (documented, all current fields) and
   `config.default.json` (everything-off-but-bootable) at repo root; the default ships in the
   build so a bare clone boots in evaluation mode.
6. **Tests:** unit tests for precedence order, schema-version rejection, freeze, and
   `getConfig()`-before-load error; `setConfig(testConfig)` as the test override pattern.

**Done when:** both apps boot with zero env (default config); `NXT_CONFIG_JSON` overrides it;
the demo capability demonstrates all three honesty behaviors; tests green.

---

## Task 4 — Root Supabase chain usable from the workspace

- [ ] **Status:** Not started
- **Depends on:** Task 1; coordinates with 002b (Task 4 there creates root `supabase/`)

- If 002b has created root `supabase/`: use it as-is (do not wait for its baseline to be
  final).
- If not: run its Task 4 now (`npx supabase@<pinned> init`, matching Postgres major) and add a
  **placeholder hello-world migration** (one table, e.g. `_pipeline_probe`), clearly named so
  it is deleted at the Task 8 interlock.
- Pin the Supabase CLI as an **exact-version** devDependency in the root `package.json`
  (same version 002b records in its decisions log) and add pnpm scripts that invoke it —
  never `supabase@latest`.

**Done when:** `pnpm supabase start` (or equivalent script) boots the local stack from the
root chain, and the CLI version is lockfile-pinned.

---

## Task 5 — Re-establish the type-generation pipeline

- [ ] **Status:** Not started
- **Depends on:** Tasks 2, 4

Port the legacy pipeline (reference: `legacy/package.json` scripts,
`legacy/.scripts/fix-supabase-json-type.js`) into pnpm scripts:

1. `gen-types-local`: `supabase gen types typescript --local --schema public` (owned schemas
   only, ADR-004 decision 3 — adopt the exact invocation 002b Task 7 recorded, if available).
2. `gen-better-types`: `better-supabase-types … --enumAsType` → port
   `fix-supabase-json-type.js` into the new workspace (e.g. `tools/scripts/`) → eslint-fix →
   output **`libs/core/src/types/supabase-types.ts`** (inside `@nxt/core`).
3. Commit the generated file; `@nxt/api` imports one generated type from `@nxt/core` so
   typecheck genuinely consumes it (golden-path requirement).

**Done when:** `pnpm generate-types:local` runs end-to-end against the local stack and
`nx run-many -t typecheck` is green consuming the committed types.

---

## Task 6 — Dockerfile (parameterized, both hosts)

- [ ] **Status:** Not started
- **Depends on:** Task 2

Single multi-stage Dockerfile at root, per ADR-006 decision 7:

- `ARG APP=api` (api | worker).
- **base:** `node:24-slim` + Corepack + pnpm.
- **build:** `pnpm install --frozen-lockfile` (BuildKit cache mount on the pnpm store) →
  `nx build ${APP}`.
- **runtime:** `pnpm deploy --prod --filter=@nxt/${APP}` for pruned `node_modules`; copy
  `dist/apps/${APP}`; run as the non-root `node` user. No Chromium in any default image.

**Done when:** `docker build --build-arg APP=api .` and `…APP=worker .` both build; both
containers boot on default config; `api`'s `/health` answers from inside the container.

---

## Task 7 — CI: PR checks + schema type-drift lane + CODEOWNERS

- [ ] **Status:** Not started
- **Depends on:** Tasks 2, 5

`.github/workflows/ci.yml` (triggers: `pull_request` targeting `oss-migration`, and `push` to
`oss-migration`; switch to `main` when the branch lands):

```
1. checkout (fetch-depth: 0)
2. setup-node@v4 (node-version: '24') + corepack enable
3. pnpm install --frozen-lockfile
4. nrwl/nx-set-shas (main-branch-name: oss-migration)
5. nx affected -t lint test typecheck build --parallel=3
```

**Type-drift guard** (same workflow, separate job, conditional on `supabase/**` or
`libs/core/src/types/**` changes): `supabase start` (lockfile-pinned CLI) →
`pnpm gen-types-local && pnpm gen-better-types` →
`git diff --exit-code libs/core/src/types/supabase-types.ts`.

**`.github/CODEOWNERS`:** `supabase/**  @bobbybol`.

Prove CI red/green honestly: one PR with a deliberate type error (must fail), one with a
schema change without regenerated types (drift guard must fail), then the clean pass.

**Done when:** all three probe PRs behaved correctly on the `oss-migration` branch and the
workflow is merged into it.

---

## Task 8 — Interlock: adopt the 002b baseline

- [ ] **Status:** Not started
- **Depends on:** Tasks 5, 7; **blocks on 002b Task 6** (verified baseline)

The join point of the two tracks (roadmap):

1. Delete the placeholder migration from Task 4 if one was created (002b's baseline replaces it).
2. `supabase db reset` → `pnpm generate-types:local` → commit regenerated
   `supabase-types.ts`.
3. Type-drift guard green in CI against the real baseline.
4. From a clean clone: `pnpm install` → `supabase start` → `pnpm generate-types:local` →
   `nx run-many -t typecheck build` — the full ADR-004 bootstrap flow, all green.

**Done when:** step 4 passes from a clean clone; roadmap interlock marked reached.

---

## Task 9 — DO deploy baseline

- [ ] **Status:** Not started
- **Depends on:** Task 2 (Task 8 preferably done first, not required)
- **Executor:** maintainer (DO account access)

Per ADR-006 decision 8 — branch-based DO App Platform deploy, no graph awareness, accepted:

| Component | Build command | Run command |
|---|---|---|
| `api` | `pnpm install && nx build api` | `node dist/apps/api/main.js` |
| `worker` | `pnpm install && nx build worker` | `node dist/apps/worker/main.js` |

- Source branch: `oss-migration` (a non-production DO app; repointed/recreated at landing).
- Config injection: inline `NXT_CONFIG_JSON` env var (ADR-007 decision 4; DO has no volume
  mounts) — the everything-off default config is sufficient at this stage.
- No DB attachment needed yet (nothing uses it at hello-world stage).

May be **parked** (like 002b Task 9.3) if the maintainer prefers to defer DO spend; the
golden path is then proven through Task 8 + Docker, with deploy following before the first
capability import completes.

**Done when:** both components deploy and `api`'s `/health` answers publicly — or the task is
explicitly parked with a note and a resume condition.

---

## Task 10 — Reintroduce git hooks (roadmap assumption 7)

- [ ] **Status:** Not started
- **Depends on:** Tasks 2, 5 (stable lint/typecheck targets); timing at maintainer discretion

Fresh setup in the new workspace (do not port `legacy/.husky/`): husky + lint-staged as
devDependencies, `prepare` script, pre-commit running lint-staged (ESLint on staged `.ts`
files only — fast by construction). Keep it lean; CI remains the authority.

**Done when:** a commit with a lint error in a staged file is blocked locally; a clean commit
passes without noticeable delay.

---

## Task 11 — Close out

- [ ] **Status:** Not started
- **Depends on:** Tasks 1–8, 10 (9 may be parked)

- **`AGENTS.md` Commands section:** update to the real new-workspace commands (pnpm/nx
  equivalents). This is a deliberate, minimal exception to the "docs deferred" rule
  (roadmap assumption 6): agents executing the capability imports need working commands.
  Everything else (root README etc.) stays deferred.
- Roadmap: 002c → Completed; capability imports (002d…) unblocked; record ADR-005's decision
  point is now approaching (assumption 2: decide before the worker host gets its first real
  capability).
- Decisions log below: complete, including exact versions chosen (Nx patch, pnpm, Node,
  Supabase CLI).

---

## Notes & decisions log

> Append here as the plan is executed. Format: `YYYY-MM-DD — [task] — note`

_(empty)_
