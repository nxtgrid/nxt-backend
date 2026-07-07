# AGENTS.md — nxt-backend

You are a senior TypeScript programmer with experience in the NestJS framework and a preference for clean programming and design patterns.

## Workflow

- Always create a plan before acting, and list actions in to-dos if more than one
- Always address the to-dos one by one, stopping between points to await code review and acceptance
- Never jump to the next point of the to-dos until prompted to do so

## Communication

- **Ask questions inline in the chat.** Write questions as normal messages in your response.
- **Never use structured question-picker / multiple-choice UI** (e.g. Cursor's AskQuestion tool). If you need a decision, ask in plain text and wait for the human's reply so they can add nuance, extra context, or instructions.

## Commands

- **Type checking:** `npm run check-types`
- **Linting:** `npm run eslint`
- **Both (lint + type check):** `npm run lint`

## Backend (this repo)

- NestJS backend for a mini-grid management platform
- Handles operations and monitoring of mini-grids:
  - Payment processing
  - Remote monitoring of production and distribution side
  - Remote interaction with smart electricity meters
- We currently use CALIN meters but plan to support other brands
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

**Architecture:** Vue 3 + Vite + Pinia (state management)

**API patterns:**

- REST API via `baseOpsRestRepo` (uses `ky` HTTP client)
- Supabase integration via `baseSupabaseRepo`
- Real-time updates via Socket.IO and Supabase realtime
- Error handling with automatic logout on 401

**Key dependencies:** `@supabase/supabase-js`, `socket.io-client`, `ky`, `pinia`

Frontend expects consistent API response formats and error structures.

## Architecture Decision Records

ADRs live in `docs/architecture/` as numbered files (e.g. `001-push-pull-pattern-divergence.md`).
**Do not read all ADRs at session start or preemptively.** Use the index below to decide what to load.

### When to read ADRs

Read ADRs **only when** the task touches architecture, cross-cutting refactors, new protocols/adapters,
deployment, or boundaries between services/modules. Skip ADRs for isolated bug fixes, tests-only
changes, or work clearly outside the domains below.

### ADR index (routing — not a substitute for reading)

| Domain | ADR(s) |
|--------|--------|
| Device messaging, push/pull, CALIN, extraction | 001, 010 |
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

### How to read (progressive)

1. **Match** — use the index (and any ADR references in `docs/plans/` for the current work) to pick candidate ADR(s).
2. **Orient** — read the **Context** and **Status** sections first; stop if the ADR clearly doesn't apply.
3. **Deep-read** — read the full ADR only for matches that constrain your change.
4. **Families** — for the 002* series, read **002** first, then sub-ADRs (002a, 002b*) only if the task falls in that subtree.
5. **Cap** — read at most **2–3 ADRs** before proposing an approach; if more may apply, list them and ask inline.
6. **New decisions** — when you make a new architectural decision, add a numbered ADR in `docs/architecture/` **and add a row to the ADR index table above** (or update an existing row if the new ADR extends an existing domain).
