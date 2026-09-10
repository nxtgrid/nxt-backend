# AGENTS.md — nxt-backend

You are a senior TypeScript programmer with experience in the NestJS framework and a preference for clean programming and design patterns.

## Workflow

- Always create a plan before acting, and list actions in to-dos if more than one
- Always address the to-dos one by one, stopping between points to await code review and acceptance
- Never jump to the next point of the to-dos until prompted to do so
- The maintainer creates git commits. Do not commit, amend, or undo commits unless the maintainer explicitly asks you to do so for that specific action.
- **No unsanctioned exploration.** When a command fails, do not launch open-ended debugging (long shell chains, repeated Docker/CI runs, simulated environments, scratch scripts, or “let me investigate” loops). Stay on repo files and short, task-specific commands. Propose a minimal fix or ask the maintainer; only run deeper investigation if they explicitly ask you to.

## Communication

- **Ask questions inline in the chat.** Write questions as normal messages in your response.
- **Never use structured question-picker / multiple-choice UI** (e.g. Cursor's AskQuestion tool). If you need a decision, ask in plain text and wait for the human's reply so they can add nuance, extra context, or instructions.
- Keep answers concise and direct.

## Commands
pnpm + Nx 23. Active projects: `api`, `worker`, `core`.

- **Lint bar:** `pnpm exec nx run-many -t lint typecheck build test -p api,worker,core`
- **Lint:** `pnpm exec nx run-many -t lint -p api,worker,core`
- **Typecheck:** `pnpm exec nx run-many -t typecheck -p api,worker,core`
- **One project:** `pnpm exec nx run <project>:lint` (or `:typecheck`, `:build`, `:test`)
- **Affected (CI):** `pnpm exec nx affected -t lint test typecheck build --parallel=3`

Pre-commit: ESLint on staged `.ts`, then `nx affected -t typecheck --uncommitted`.

- **Serve:** `pnpm exec nx serve api` / `worker`
- **Type-gen:** `pnpm generate-types:local` (needs `pnpm supabase start`)

## Backend (this repo)

- NestJS backend for a mini-grid management platform
- Handles operations and monitoring of mini-grids:
  - Payment processing
  - Remote monitoring of production and distribution side
  - Remote interaction with smart electricity meters
- We currently use CALIN meters but plan to support other brands
- Meter command delivery (only if **Metering** is enabled in config, ADR-007): HTTP + HMAC
  webhook to [`nxt-device-messaging`](https://github.com/nxtgrid/nxt-device-messaging)
  (`../nxt-device-messaging`). Same-app App Platform sidecar when that flag is on
  (`docs/deployment/digital-ocean-buildpack.md`). Wire types:
  `@nxtgrid/device-messaging-contract`. Metering is not imported yet; without the flag,
  this host does not call that service.
- Authentication via Supabase Auth
- Primary database: Supabase (PostgreSQL). Separate timescale database for time-series data
- Code is organized in an Nx monorepo with apps and libs

## Frontend ecosystem

Repositories are located one directory up from nxt-backend:

- `../qilin` — Shared library with components, API clients, and utilities
- `../pegasus` — Operations management dashboard (uses Socket.IO for real-time)
- `../eos` — Client dashboard
- `../niffler` — Payments app
- `../sphinx` — Technician app for meter/pole assignment

**Sibling service (not a frontend):** `../nxt-device-messaging` — command delivery when
Metering is on. ADRs 005 §11, 006 §8, 010 §I.

**Architecture:** Vue 3 + Vite + Pinia (state management)

**API patterns:**

- REST API via `baseOpsRestRepo` (uses `ky` HTTP client)
- Supabase integration via `baseSupabaseRepo`
- Real-time updates via Socket.IO and Supabase realtime
- Error handling with automatic logout on 401

**Key dependencies:** `@supabase/supabase-js`, `socket.io-client`, `ky`, `pinia`

Frontend expects consistent API response formats and error structures.

## Architecture Decision Records

ADRs live in `docs/architecture/` as numbered files (e.g. `007-configuration-and-wiring-mechanism.md`).
**Do not read all ADRs at session start or preemptively.** Use the index below to decide what to load.

**Superseded ADRs are not in the index and must not be read for guidance.** An ADR whose Status says
Superseded is a historical record; open it only if the task explicitly asks for the historical
reasoning. Currently superseded: **001** (PUSH/PULL divergence — resolved by the ADR-010 extraction
and answered in `nxt-device-messaging`'s own ADRs).

### When to read ADRs

Read ADRs **only when** the task touches architecture, cross-cutting refactors, new protocols/adapters,
deployment, or boundaries between services/modules. Skip ADRs for isolated bug fixes, tests-only
changes, or work clearly outside the domains below.

### ADR index (routing — not a substitute for reading)

| Domain | ADR(s) |
|--------|--------|
| Device messaging, CALIN, extraction, suite sidecar | 005 §11, 006 §8, 010 |
| Meter state management (overview) | 002 |
| Meter state — reconciliation controller | 002a |
| Meter state — device shadows | 002b1 |
| Meter state — interaction coalescing | 002b2 |
| Meter state — reconciliation loop | 002b3 |
| Payments / Flutterwave credentials | 003 |
| Open-source architecture, capability modules | 004 |
| Inter-host communication | 005 |
| Monorepo tooling & CI/CD | 006 |
| Configuration & wiring | 007 |
| Open-source migration strategy | 008 |
| Database migration deployment & governance | 009 |
| Meter command batches, load shedding, meter grouping | 011 |
| Company cutover strategy | 012 |
| Capability vs core boundaries, behavior/module placement | 013 |
| Machine credentials — API keys, scopes, Postgres roles, MCP | 014 |

### How to read (progressive)

1. **Match** — use the index (and any ADR references in `docs/plans/` for the current work) to pick candidate ADR(s).
2. **Orient** — read the **Context** and **Status** sections first; stop if the ADR clearly doesn't apply.
3. **Deep-read** — read the full ADR only for matches that constrain your change.
4. **Families** — for the 002* series, read **002** first, then sub-ADRs (002a, 002b*) only if the task falls in that subtree.
5. **Cap** — read at most **2–3 ADRs** before proposing an approach; if more may apply, list them and ask inline.
6. **New decisions** — when you make a new architectural decision, add a numbered ADR in `docs/architecture/` **and add a row to the ADR index table above** (or update an existing row if the new ADR extends an existing domain).
