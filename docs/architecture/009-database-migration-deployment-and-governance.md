# ADR-009: Database Migration Deployment & Governance

**Date:** 2026-06-29
**Status:** Accepted

---

## Context

ADR-004 establishes the monorepo (decision 2) and migrations as the canonical schema source of truth,
with the generated types a derived, checked-in artifact (decision 3). ADR-008 covers the one-time
baseline/squash. This ADR decides **how migrations are deployed and governed** in an open-source,
multi-operator world — and resolves the recurring "should migrations live in a separate repo?" question.

### Current state

- Migration application to production is performed by **Supabase's native GitHub integration**,
  configured in the Supabase **dashboard** (not in the repository): pushing migration files to the
  production branch **auto-applies them to the production database**. `supabase/.branches/_current_branch`
  is `main`.
- There is **no migration-apply workflow in the repo** (only the stubbed `.github/workflows/deploy-to-do.yml`).
- This auto-apply is convenient for a single company that owns everything, but it is **not acceptable to
  impose on an external adopter**: outside operators do not want a `git push` to silently mutate their
  production database.

Two questions were raised:
1. How should migration application be governed for OSS adopters?
2. Should migrations move to a separate repo, with types still generated in the monorepo?

## Decision

### 1. Decouple "schema lives in the repo" from "schema gets applied"
The repository is the canonical source of truth for the schema. **When and how it is applied is an
operator decision, never an implicit side effect of `git push`.**

### 2. No auto-apply-to-production as the OSS default
The product ships migrations + an explicit, documented apply step (`supabase db push` /
`supabase migration up`). Adopters choose where on this spectrum they sit, defaulting to the safe end:
- **Manual (default):** operator runs the apply command deliberately.
- **CI with manual approval:** a `workflow_dispatch` job or GitHub Environment protection rule that
  requires human approval before applying — never implicit on push.
- **Release-pinned:** migrations apply only on tagged releases the operator opts into.

Schema application is **decoupled from code deployment** (separate lifecycle events).

### 3. Company auto-apply is private ops, not part of the product
NXT Grid's dashboard GitHub-integration auto-apply remains a **private operational choice** and is not
part of the public OSS product (consistent with ADR-004 decision 1: company-specific operations live
outside the shared code). Nothing about the current company convenience is lost.

### 4. Safety rails (recommended regardless of mechanism)
- Forward-only, reviewed migrations.
- `supabase db diff` preview before apply.
- Backup / PITR checkpoint before destructive changes.
- A documented upgrade runbook: pull version → read migration changelog → backup → apply → deploy.

### 5. Migrations stay in the monorepo (separate migrations repo rejected)
Type generation has a **hard build-time dependency on the schema** (it builds a local DB from
migrations). A separate migrations repo therefore does **not** decouple types from schema — it forces
the monorepo to fetch the other repo at build time (submodule/package/DB) and reintroduces exactly the
costs the monorepo was chosen to avoid:
- Loss of atomic "schema change → regenerate types → typecheck all 120+ consumers in **one** PR/CI run".
- Destructive migrations can land "green" in the schema repo while silently breaking the app repo until
  a version bump.
- Two CI/release/review pipelines at the highest-friction seam, for a two-person team.

The benefits a separate repo could offer (independent consumption by many services; hard DBA-vs-app
access separation) do not apply to a single-team modular monolith.

### 6. Govern `supabase/` as a logically separate unit *within* the monorepo
This captures the legitimate governance/cadence separation without a repo split:
- `CODEOWNERS` on `supabase/**` (schema changes require a designated reviewer).
- Branch protection / required status checks specific to migration files.
- A dedicated schema CI lane: the type-drift regenerate-and-diff check (ADR-004 decision 3), a migration
  linter, and a `db diff` preview on PRs.
- Its own changelog/versioning for the schema.
- The opt-in, operator-controlled apply pipeline from decisions 1–2.

## Consequences

### Positive
- External operators are never surprised by schema changes; they own the trigger.
- Monorepo atomicity for type generation is preserved (ADR-004 decision 2).
- Schema still gets strong, separate governance (ownership, review, dedicated CI).
- The company keeps its current auto-apply convenience privately.

### Negative / Risks
- Operators must run a deliberate apply step (slightly less "magic" than push-to-deploy).
- In-repo governance relies on discipline (CODEOWNERS/branch protection) rather than a hard repo wall.

## Rejected Alternatives

- **Separate migrations repo (types generated in monorepo).** Rejected per decision 5. If a future
  trigger forces it, the least-bad mechanism is: the schema repo holds migrations; the monorepo includes
  it as a **git submodule pinned to a SHA**; type-gen builds a local DB from the submodule and commits
  the types with a drift check against that pinned SHA. Adopt only on a real trigger.

## Triggers (revisit when)
- A second, independent service needs to consume the schema on its own release cadence.
- Org/compliance requires hard access-control separation between schema and application changes.

## Related
- **ADR-004** — monorepo (decision 2), canonical migrations + derived types (decision 3).
- **ADR-006** — CI/CD; hosts the schema CI lane and the opt-in apply pipeline.
- **ADR-008** — one-time baseline/squash of the migration history.
