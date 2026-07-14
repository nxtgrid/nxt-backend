# 002c — Scaffold, Pipeline & Config Skeleton

**Parent plan:** `docs/plans/002-oss-migration.md` (read it first)
**Decisions:** ADR-006 (tooling/CI — this plan executes it), ADR-007 (config mechanism — this
plan builds the skeleton), ADR-008 (Phase 1: prove the golden path on hello-world before any
domain code lands)
**Created:** 2026-07-08
**Status:** In progress — Tasks 1–4 complete; Task 5 next
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
| Monorepo tool | Nx **23.0.2** (or latest 23.x patch at execution time — record in decisions log), full-modern layout: Project Crystal inferred targets + TS-solution/package-based |
| Package naming | `@nxt/<name>` scoped packages, pnpm `workspace:*`, imports via package names (no path aliases) |
| Package manager | pnpm, Corepack-pinned via `packageManager`; **`pnpm-lock.yaml` committed** |
| Node | 24 LTS on all pinning surfaces (`.nvmrc`, `engines`, `packageManager`, CI, Docker) |
| Apps | `api` and `worker` via `@nx/nest` generator defaults (webpack + tsc, `swcJest: true`, ESLint flat config) |
| CI | GitHub Actions, `nx affected -t lint test typecheck build`, conditional schema type-drift lane |
| Deploy baseline | DO App Platform building from a GitHub branch (no graph awareness — accepted) |
| Dropped hacks | `npm-force-resolutions`, `resolutions`, gitignored lockfile, `fix-node-cpu` — zero forward weight, not ported |

## Current state snapshot (2026-07-14 — updated after Tasks 1–4)

- **Workspace live at root:** Nx 23.0.2 + pnpm 11.12.0 + Node 24. Projects: `apps/api`
  (`@nxt/api`), `apps/worker` (`@nxt/worker`), `libs/core` (`@nxt/core`). `pnpm-lock.yaml`
  tracked. `legacy/` excluded from graph via `.nxignore`.
- **Hello-world:** `api` serves `GET /health` (name+version from `@nxt/core`); `worker` logs a
  heartbeat via `@nestjs/schedule`, no HTTP. `nx run-many -t lint typecheck build test -p
  api,worker,core` is green (`test` now runs real jest specs on `core`; still `nx:noop` on
  api/worker until real tests land there).
- **Config skeleton (Task 3):** `@nxt/core` exports `getConfig`/`setConfig`/`loadConfig`/
  `requireEnv` from `src/config/`; both apps call `loadConfig()` in `main.ts` before importing
  `AppModule` (dynamic `import()`, required so a static import doesn't evaluate the module's
  capability-composition decorator before config loads) and compose
  `imports: [ ...alwaysOn, ...demoModules(getConfig()) ]`. Root `config.example.json` /
  `config.default.json` ship the current schema; the default is copied into each app's
  `dist/` via a webpack asset entry so a bare build boots in evaluation mode with zero env.
  Temporary `demo` capability in `@nxt/core` proves the three Tier-1 honesty behaviors — see
  the decisions log for what's deferred (adminOrganizationId/systemWalletId sourcing,
  `NXT_CONFIG_URL`, demo removal trigger).
- **Layout:** legacy-aligned `src/modules/` (no `src/app/`); `@nxt/core` exports from
  `src/modules/platform/` and `src/modules/demo/`. Root `package.json` is tooling-only; runtime
  deps live per app/lib.
- **Supabase (Task 4):** root `supabase/` chain from 002b (`config.toml`: Postgres 17, API
  `54321`, DB `54322`); CLI pinned `2.109.1` at root with `pnpm supabase` script;
  `docs/deployment/supabase.md` updated. **Local start verified:** `pnpm supabase start` from
  repo root boots the stack; `20260710120000_init` applied; Postgres 17.6 reachable on
  `127.0.0.1:54322`; API on `127.0.0.1:54321`.
- Legacy stack (reference only, in `legacy/`): Nx 21.2.2, npm, Node 22, webpack, path-alias
  imports (`@core`, `@tiamat`, `@helpers`), `.eslintrc`-era config referenced from `nx.json`.
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

- [x] **Status:** Complete (2026-07-14)
- **Depends on:** 002a complete

`create-nx-workspace` requires an empty directory; the repo root is not. Standard workaround:
generate into a temp dir, then move contents into the root.

```bash
npx create-nx-workspace@23.0.2 nxt-backend \
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

- [x] **Status:** Complete (2026-07-14)
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

**Webpack + pnpm note (recorded):** Nx's default `externalDependencies: 'all'` reads only the
workspace-root `node_modules/`. Under pnpm, app runtime deps (e.g. `@nestjs/common`) live under
`apps/<host>/node_modules/`, so webpack bundled all of Nest and failed on optional peers. Fix:
each host's `webpack.config.js` uses `webpack-node-externals` with `modulesFromFile` pointing
at that app's `package.json`, plus `externalDependencies: 'none'` and `mergeExternals: true` on
`NxAppWebpackPlugin`. No need to restore Nest optional peers at root unless those features are
used.

---

## Task 3 — ADR-007 config skeleton in `@nxt/core`

- [x] **Status:** Complete (2026-07-14)
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
7. **`deployment.adminOrganizationId` (register #22 / ADR-007 Amendment):** the platform
   operator org is **DB-native** — not a static JSON fact. Before closing this task, **decide and
   record** how the config layer exposes it: boot-time DB query into `getConfig()`, drop from
   Zod schema and query `organizations` at call sites, or keep schema field with a documented
   override path for eval mode only. Parent roadmap assumption **#9**. Do not ship hello-world
   with an implied JSON-sourced admin org id without recording the choice.

**Done when:** both apps boot with zero env (default config); `NXT_CONFIG_JSON` overrides it;
the demo capability demonstrates all three honesty behaviors; tests green.

---

## Task 4 — Root Supabase chain usable from the workspace

- [x] **Status:** Complete (2026-07-14)
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

- 2026-07-14 — [1] — Nx **23.0.2**, pnpm **11.12.0**, Node **24** on all pinning surfaces.
  Root package name `nxt-backend` (unscoped). `tsconfig.base.json` uses `customConditions:
  ["source"]` for TS-solution exports.
- 2026-07-14 — [1] — `create-nx-workspace@23.0.2 --preset=ts --package-manager=pnpm`. Merged
  `.gitignore` (lockfile tracked; depth-aware `dist/`/`node_modules/` ignores; `legacy/`
  tracked). `.nxignore` excludes `legacy`. `pnpm-workspace.yaml` `allowBuilds` whitelists
  native build scripts (`@swc/core`, `nx`, etc.) — do not use `pnpm approve-builds` (leaves
  invalid placeholder text).
- 2026-07-14 — [2] — Nx 23 `@nx/nest:application` defaults changed: pass
  `--linter=eslint --unitTestRunner=jest --e2eTestRunner=none` explicitly. Generated hosts use
  `nx:run-commands` + `webpack-cli build` (inferred by `@nx/webpack/plugin`).
- 2026-07-14 — [2] — Restructured to legacy-aligned layout: `src/modules/` (removed `src/app/`,
  `src/assets/`); `libs/core/src/modules/platform/`. Webpack `assets: []`.
- 2026-07-14 — [2] — ESLint: root `eslint.config.mjs` with team rules ported from
  `legacy/eslint.config.ts`. Legacy launch configs removed from `.vscode/launch.json`.
- 2026-07-14 — [2] — `test` target set to `nx:noop` on api, worker, core until real tests
  exist. Lint bar: `nx run-many -t lint typecheck build -p api,worker,core`.
- 2026-07-14 — [2] — Deps policy: root = tooling only (`@nx/*`, eslint, webpack, supabase CLI,
  etc.); Nest runtime deps on each host's `package.json`. `@nxt/core` is a `workspace:*`
  devDependency of `@nxt/api`. **Superseded 2026-07-14 (Task 3) — see the correction note
  below: this should have been (and now is) a regular `dependencies` entry.**
- 2026-07-14 — [2] — Boundary probe: undeclared `@nxt/worker` import in api → `TS2307`; reverted.
- 2026-07-14 — [2] — Webpack externals fix for pnpm (see Task 2 note above).
- 2026-07-14 — [4-prep] — Supabase CLI `2.109.1` pinned at root; `pnpm supabase` script;
  `docs/deployment/supabase.md` updated. Root `supabase/` chain present (002b); full Task 4
  closure (local start verified) still pending.
- 2026-07-14 — [3] — **`deployment.adminOrganizationId` / `systemWalletId` (register #22 /
  ADR-007 Amendment) resolved:** both stay as plain configured Zod fields (optional, no DB
  query at load or boot). Rejected the "drop from schema, query `organizations` at call sites"
  and "boot-time DB query into `getConfig()`" alternatives — the maintainer wants the config
  layer to stay simple and fully DB-free; the DB-native fact (`organizations.organization_type
  = 'PLATFORM_OPERATOR'`, read directly by RLS per the 2026-07-13 GUC-removal amendment) and
  the config value are accepted as two independently-set facts that should agree but aren't
  mechanically linked at this stage. Both fields optional in the Zod shape so a zero-config
  boot still validates; a capability that actually depends on one calls a co-located
  `requireDeploymentField`-style helper (sibling to `requireEnv`, same `MISSING deployment.<field>
  — required by <consumer>` fail-fast convention) **at its own point of use, not at global
  load** — deferred to whichever task first adds a real consumer (2002d), since no consumer
  exists yet and the helper would have zero callers in Task 3.
- 2026-07-14 — [3] — **Drift mitigation (ADR-007 Deferred: "DB existence validation of
  `adminOrganizationId`") scoped, not built in Task 3:** a one-time (memoized, not per-request),
  **warn-only** boot/first-use check will compare `getConfig().deployment.adminOrganizationId`
  against the DB's `PLATFORM_OPERATOR` `organizations` row and log on mismatch/absence; boot
  is never blocked by this check (mirrors ADR-007's own "warn-level" framing — a hard fail here
  would make a DB-side admin-org change brick boot until config is also edited and redeployed,
  cutting against the Amendment's "flipping the flag is friendlier to operate" rationale).
  Deferred until a Supabase client first exists in a wired app — Task 3 stays DB-free per its
  own "done when" (zero-env boot). Not extended to `systemWalletId` (no analogous DB-side
  marker exists for wallets; explicitly not pursued now — would require its own schema/ADR
  work in a `wallets` domain that hasn't been imported yet).
- 2026-07-14 — [3] — **`NXT_CONFIG_URL` slot simplified:** no runtime env-var check/branch in
  the loader (not even a throwing guard) — just a code comment at its position in the
  precedence chain, pointing at ADR-007 decision 4. Rationale: it isn't documented anywhere as
  usable (only ADR-007 mentions it, which itself says "not implemented"), so an operator
  can't organically set it by accident; building a branch (+ test) for a source with zero
  current consumers (no CMS, no Spaces bucket) was judged not worth it. `NXT_CONFIG_JSON` and
  `NXT_CONFIG_PATH` are both fully implemented — each has a real near-term consumer (Task 9 DO
  deploy; Task 6 Docker/k8s bind-mount and local dev respectively).
- 2026-07-14 — [3] — **Demo capability is temporary scaffolding, not a kept reference.** It
  exists solely to prove the three Tier-1 honesty behaviors (flag off → not instantiated; flag
  on → loads; flag on + required env missing → `MISSING …` boot block) and to give later
  capabilities a copy-able `requireEnv` pattern. Named unambiguously (`demo` capability key,
  `DemoModule`, `modules/demo/`) so it's grep-able; to be deleted once the first real Tier-1
  capability lands and demonstrates the same pattern in its place (flag this at that point —
  do not let it linger as unintentional permanent code).
- 2026-07-14 — [3] — **Frontend/shared-resource config delivery stays deferred** per ADR-007
  decision 11 — no `public.branding`-style placeholder added ahead of a real consumer. Convention
  for later: `public` carries browser-safe *values* only; actual assets (logos, etc.) live in
  object storage and get referenced from `public` as a URL string once a consumer exists.
- 2026-07-14 — [3] — **Implementation note (discovered, not pre-planned): `AppModule` must be
  imported dynamically in `main.ts`, after `loadConfig()`.** A static `import { AppModule } from
  './modules/app.module'` is hoisted and evaluates the module's `@Module(...)` decorator (which
  calls `demoModules(getConfig())`) before `bootstrap()`'s own body — including `loadConfig()` —
  ever runs, so `getConfig()` would always throw "before load". Fix: `loadConfig()` first, then
  `const { AppModule } = await import('./modules/app.module.js')` (note: the dynamic import
  specifier needs the explicit `.js` extension for `tsc --build` under `moduleResolution:
  nodenext`, even though the equivalent static import does not — TS resolves dynamic `import()`
  expressions under stricter ESM rules regardless of the CJS/ESM mode inferred for the file).
  This is the pattern every later app-level `main.ts` copies when adding a real capability tree.
- 2026-07-14 — [3] — Config layer implementation landed: `libs/core/src/config/{schema,loader,
  index,require-env}.ts`; `zod` (`^4.4.3`) and `@nestjs/common` (`^11.0.0`, for the demo
  module's decorators) added as real `@nxt/core` dependencies. Temporary `demo` capability in
  `libs/core/src/modules/demo/` (schema + module + `demoModules()` contribution function).
  `core`'s jest `test` target re-enabled (removed the `nx:noop` override); added a
  `moduleNameMapper` stripping `.js` from relative import specifiers so Jest resolves the
  NodeNext-style `.js`-suffixed imports back to their `.ts` siblings. 10 tests across
  `loader.spec.ts`, `index.spec.ts`, `demo-modules.spec.ts` cover precedence order,
  `$schemaVersion` rejection, freeze, `getConfig()`-before-load, and all three demo honesty
  behaviors. Verified live against the built `dist/apps/{api,worker}/main.js` (not just unit
  calls): zero-env boot, `NXT_CONFIG_JSON` override, and the demo's missing-env boot block, all
  behaved as designed. `nx run-many -t lint typecheck build test -p api,worker,core` green from
  a cold `nx reset`.
- 2026-07-14 — [3] — **Correction: `@nxt/core` moved from `devDependencies` to `dependencies`
  in both `apps/api/package.json` and `apps/worker/package.json`** (supersedes the Task 2 note
  above). Task 2's classification was made without checking whether webpack actually inlines or
  externalizes the package; it does not inline it — `dist/apps/api/main.js` contains a real
  `module.exports = require("@nxt/core")` (confirmed by inspecting the bundle directly), so the
  running process needs `@nxt/core` genuinely resolvable at runtime, not just at build time.
  `webpack-node-externals`'s `modulesFromFile` externalizes both `dependencies` and
  `devDependencies` by default, so that part didn't matter — but the two Nx executors already
  wired into each host's `prune`/`prune-lockfile`/`copy-workspace-modules` targets
  (`@nx/js:prune-lockfile`, `@nx/js:copy-workspace-modules`) only read `packageJson.dependencies`
  when deciding which workspace packages to rewrite into `workspace_modules` for a pruned
  deploy artifact (confirmed by reading both executors' source); `devDependencies` are ignored.
  Left as a devDependency, a genuinely pruned build (Task 6 Docker copying only
  `dist/apps/api`, or `pnpm deploy --prod` per Task 6's plan text, which explicitly excludes
  devDependencies) would ship a `main.js` requiring a package absent from the pruned output —
  a latent `MODULE_NOT_FOUND` at container boot, masked so far because dev/test always run from
  the full workspace checkout where `node_modules/@nxt/core` exists regardless. Verified the fix
  by actually running `nx run api:prune` / `nx run worker:prune` after reclassifying: the pruned
  `dist/apps/{api,worker}/package.json` now rewrites `@nxt/core` to
  `"file:./workspace_modules/@nxt/core"` and the real package contents are copied into
  `workspace_modules/@nxt/core`. Full `lint typecheck build test` bar re-verified green after
  the change. Caught by the maintainer noticing the question was worth double-checking rather
  than trusting the original Task 2 note (or this agent's own initial, incorrect restatement of
  it) at face value.
- 2026-07-14 — [4] — **Local start verified** from repo root via `pnpm supabase start` (CLI
  `2.109.1`, lockfile-pinned). Used existing 002b root chain as-is — no placeholder migration.
  Baseline `20260710120000_init` is the sole applied migration; Postgres **17.6** on
  `127.0.0.1:54322`, API `127.0.0.1:54321`. First run hit a transient ECR
  `toomanyrequests` on `postgres:17.6.1.141`; CLI retried and succeeded. Informational gotrue
  version warning (local `v2.192.0` vs linked remote `v2.193.0`) — no action taken. Log showed
  `Starting database from backup...` (existing local Docker volume, not a fresh init).
