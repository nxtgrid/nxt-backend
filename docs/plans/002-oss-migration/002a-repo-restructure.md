# 002a — Repo Restructure (Step 0)

**Parent plan:** `docs/plans/002-oss-migration.md` (read it first)
**Decisions:** ADR-008 (re-scaffold strategy); Step-0 mechanics decided with maintainer 2026-07-08
(see roadmap decisions log)
**Created:** 2026-07-08
**Status:** Completed
**Execution model:** collaborative — the maintainer may execute tasks manually with the agent
advising, or the agent may execute under maintainer review. Ask which mode applies before
starting a task; see "Division of labor" in the parent plan.

---

## Purpose

Move everything that exists in the repo today into a frozen `legacy/` folder, in one atomic
rename-only commit, so that the repo root becomes clear ground for the two groundwork tracks:
the new database baseline (002b, root `supabase/`) and the fresh Nx workspace (002c). This
sub-plan blocks both tracks and must be executed first.

**Estimated effort:** half a day.

## Pre-conditions (confirmed by maintainer, 2026-07-08)

- **No external automation watches this repo.** Company production builds from the private
  repository; this public repo is a sanitized copy. The Supabase GitHub auto-apply integration
  (ADR-009) is connected to the private repo, not this one. No DO app deploys from here. No
  pre-flight checks required.
- **Branch strategy:** the entire OSS migration is executed on a long-running branch
  (**`oss-migration`**), created from `main` at Step 0. `main` keeps the original tree
  (including the original `README.md`) untouched until the migration lands. When and how the
  branch lands on `main` is decided in a later phase (see roadmap).

## Current root inventory and fate

Snapshot taken 2026-07-08. Verify against reality before executing (`ls -A`, `git ls-files`).

| Root entry | Tracked | Fate |
|---|---|---|
| `apps/`, `libs/`, `supabase/` | yes | → `legacy/` |
| `package.json`, `nx.json`, `tsconfig.base.json` | yes | → `legacy/` |
| `eslint.config.ts`, `jest.config.ts`, `jest.preset.js`, `global.d.ts`, `.babelrc`, `.nxignore` | yes | → `legacy/` |
| `.nvmrc` (v22.9.0) | yes | → `legacy/` (new workspace pins Node 24 per ADR-006) |
| `.husky/`, `.scripts/` | yes | → `legacy/` |
| `.github/workflows/deploy-to-do.yml` | yes | → `legacy/.github-workflows/` (stub per ADR-009; moving it disables it — intended) |
| `.gitignore`, `.github/` (rest, if any) | yes | stay at root |
| `.editorconfig` | yes | stay at root |
| `README.md` | yes | → `legacy/` (a new root README is authored in a later phase — or this one is copied back and updated; `main` keeps the original meanwhile) |
| `docs/`, `AGENTS.md`, `LICENSE`, `AUTHORS.md`, `CONTRIBUTING.md`, `CONTRIBUTORS.md` | yes | stay at root |
| `.cursor/`, `.vscode/`, `.cursorignore` | yes | stay at root (editor/agent config; path-specific rules reviewed in 002c) |
| `package-lock.json` | no (gitignored) | plain `mv` → `legacy/` (kept for reference; stays ignored) |
| `dist/`, `.nx/`, `node_modules/`, `.DS_Store`, `.snaplet/` | no | delete (stale local artifacts) |

## Non-goals

- No new workspace files are created here (002c owns the scaffold).
- No `supabase init` at root (002b owns the new baseline).
- No content changes inside moved files — ever. `legacy/` is frozen from the move onward.

## Accepted transitional state

On the `oss-migration` branch, between this sub-plan and the completion of 002c, the repo has
**no buildable workspace at root**: the `npm run check-types` / `eslint` / `lint` commands in
`AGENTS.md` are dead, git hooks are suspended, and no CI workflow runs. This is acceptable
because the public repo is not production (ADR-008) and `main` retains the original working
tree. Documentation updates (root README, AGENTS.md commands) are **deliberately deferred** to
the later phases of the migration.

---

## Task 1 — The move commit (rename-only)

- [x] **Status:** Completed (2026-07-08)
- **Depends on:** nothing

Create the `oss-migration` branch from `main`. On a clean working tree, on that branch:

```bash
mkdir legacy
git mv apps libs supabase legacy/
git mv package.json nx.json tsconfig.base.json README.md legacy/
git mv eslint.config.ts jest.config.ts jest.preset.js global.d.ts legacy/
git mv .babelrc .nxignore .nvmrc .husky .scripts legacy/
mkdir legacy/.github-workflows
git mv .github/workflows/deploy-to-do.yml legacy/.github-workflows/
mv package-lock.json legacy/   # untracked (gitignored); plain mv
```

Commit with **no other changes** — pure renames keep git's similarity detection at 100% so
`git log --follow` works through the move.

**Rules:**

- Nothing else goes in this commit: no README, no edits, no deletions of untracked junk.
- If `ls -A` reveals tracked root entries not in the inventory table above, decide their fate
  with the maintainer and update the table before committing.

**Done when:** `git show -M --summary HEAD` lists only `rename … (100%)` lines (plus the
untracked lockfile move, which git does not see), and `git ls-files | grep -v '^legacy/'`
returns only the intended root survivors (`docs/`, `.github/`, `.gitignore`, `.cursor/`,
`.vscode/`, `AGENTS.md`, and the license/contributor files).

---

## Task 2 — Follow-up commit: freeze notice

- [x] **Status:** Completed (2026-07-08)
- **Depends on:** Task 1

Content changes go in a **separate commit** after the move:

1. **`legacy/README.md`** (new file) declaring:
   - This folder is a frozen, read-only reference of the pre-migration codebase.
   - It is never built, installed, or run; it is excluded from the workspace, CI, and all
     toolchains.
   - Files are **never edited** — only deleted, one by one, when fully superseded in the new
     workspace (see roadmap: import ledger / exit condition).
   - To observe legacy behavior live, use the private company repo.
2. **`.gitignore`:** verify existing entries still make sense (e.g. `dist/`, `.nx/`,
   `package-lock.json` remain harmlessly ignored at any depth). Only adjust what is broken;
   002c owns the fresh ignore set.

No other documentation is touched: root README and AGENTS.md updates are deferred to the later
phases of the migration (see "Accepted transitional state").

**Done when:** `legacy/README.md` is committed and states the never-edit/delete-only rule.

---

## Task 3 — Local cleanup (per clone, not committed)

- [x] **Status:** Completed (2026-07-08)
- **Depends on:** Task 1

1. Delete stale untracked artifacts at root: `dist/`, `.nx/`, `node_modules/`, `.DS_Store`,
   `.snaplet/`.
2. Husky v9 sets `core.hooksPath` in the *local* git config; with `.husky/` moved, hooks
   silently stop firing. Clean up: `git config --unset core.hooksPath` (repeat in any other
   clone). **Git hooks stay suspended deliberately** during the groundwork phases;
   reintroduction (lint-staged on the new workspace) is a task in 002c, activated once the new
   lint/typecheck targets are stable (see roadmap assumption 6).

**Done when:** `git status` is clean, root contains only the intended survivors plus
`legacy/`, and `git config core.hooksPath` returns nothing.

---

## Task 4 — Verification

- [x] **Status:** Completed (2026-07-08)
- **Depends on:** Tasks 1–3

1. **History-follow spot check** on at least two deep files, e.g.:

```bash
git log --follow --oneline -- legacy/apps/tiamat/src/main.ts
git log --follow --oneline -- legacy/libs/core/src/types/supabase-types.ts
```

   Both must show pre-move history, not just the move commit.
2. **No stray references:** confirm nothing at root (outside `docs/` and `legacy/`) still
   references the old root paths — check `.cursor/rules/*.mdc`, `.vscode/`, remaining
   `.github/` files. Fix or note for 002c.
3. Push the `oss-migration` branch. **No merge to `main`** — the branch is the long-running
   home of the migration (see Pre-conditions).

**Done when:** both spot checks pass, findings from (2) are recorded below, and the branch is
pushed. Update the roadmap sub-plan index: 002a → Completed; 002b and 002c unblocked.

---

## Notes & decisions log

> Append here as the plan is executed. Format: `YYYY-MM-DD — [task] — note`

- `2026-07-08 — [task 1] — Root `.editorconfig` exists in the live tree and remains at repo root; inventory table updated before the move.`
- `2026-07-08 — [task 1] — Move executed as a pure rename-only staged change set; local untracked Supabase artifacts were cleaned outside the move commit.`
- `2026-07-08 — [task 2] — Added `legacy/README.md` freeze notice and extended `.gitignore` to cover `legacy/supabase/.temp` and `.branches`, the only ignore rules broken by the move.`
- `2026-07-08 — [task 3] — Deleted stale root artifacts (`dist/`, `.nx/`, `.DS_Store`, `.snaplet/`); `node_modules/` was already absent and `core.hooksPath` was already unset in this clone.`
- `2026-07-08 — [task 4] — History-follow checks passed for `legacy/apps/tiamat/src/main.ts` and `legacy/libs/core/src/types/supabase-types.ts`.`
- `2026-07-08 — [task 4] — No root survivor outside `docs/` and `legacy/` referenced the old root paths except `.vscode/settings.json` search excludes for `libs/*/migration` and `supabase/migrations`; harmless for Step 0 and deferred to 002c path-specific cleanup.`
