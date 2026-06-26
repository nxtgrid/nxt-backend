# ADR-008: Open-Source Migration Strategy — Re-Scaffold & Incremental Import

**Date:** 2026-06-26
**Status:** Accepted (strategy); execution detail in ADR-006 (tooling/CI) and ADR-007 (config)

---

## Context

ADR-004 sets the target architecture (single-track, monorepo, capability-based modular monolith,
per-deployment config). This ADR decides *how we get there from the current code*.

Two end-member approaches were considered:

- **Full rewrite** (new repo, existing code as reference only): rejected. It discards hard-won domain
  edge cases (cf. ADR-001 rate-limiting, ADR-002 reconciliation, CALIN quirks), is infeasible for a
  small team while operating production, and re-creates the dual-track trap ADR-004 decision 1 rejects.
- **Pure in-place refactor**: viable, but the workspace tooling/CI is old (see ADR-006) and the
  database carries dump-based migrations plus deprecated/company-specific objects worth cleaning at the
  baseline.

The chosen path is the middle ground: a **fresh scaffold** into which existing modules are **moved**
(behavior-preserving), not re-authored. This is a strangler-fig migration, not a rewrite.

**Why this is low-risk now:** the public `nxt-backend` is **not yet production** (production currently
runs the private company repo). The public repo can therefore be restructured aggressively without
production risk. The constraint is reaching functional parity so it can *become* the single-track
production repo.

## Decision

Execute the migration in four phases. Each phase is shippable and reversible; technical debt is paid
down opportunistically as modules are touched, against an explicit plan rather than all at once.

### Phase 1 — Fresh scaffold + proven pipeline + config skeleton
- Stand up a modern, minimal Nx workspace (decisions in ADR-006).
- **Prove the golden path on a hello-world** before any domain code lands: `migration up` → local DB →
  `gen-types` → typecheck → `affected` build → per-host Docker image → deploy, all green in CI,
  including the type-drift guard (ADR-004 decision 3).
- Establish a **minimal config contract/skeleton** (ADR-007) so every later capability plugs into one
  consistent mechanism instead of N ad-hoc styles.

### Phase 2 — Database baseline
- Author a single canonical **init migration** representing the clean target schema, and verify it is
  **equivalent to current production** (minus intentionally excluded objects) via schema diff before
  adoption. Baseline existing environments (mark init as already-applied); forward-only thereafter.
  Old migrations remain in git history.
- Classify every table / enum / role into four buckets:
  - **Keep (capability-scoped):** owned by a live capability; gated by flags at runtime, never dropped
    (e.g. meters, mppts, orders).
  - **Drop (dead):** objects behind the deleted `一`-prefixed modules and orphaned columns.
  - **Parameterize (company-specific infra):** e.g. `grafana_readonly` / `make_readonly` roles —
    moved out of base into optional/config.
  - **Exclude (deprecated / historical-only):** e.g. `directives` / `lorawan-directives` + their enums,
    superseded by `meter-interactions`, kept today only for historical `orders` links. Excluded from
    the OSS baseline entirely (cf. ADR-004 decision 9).
- The OSS baseline schema = live schema − (dead + deprecated), with company infra parameterized.

### Phase 3 — Incremental module import (dependency-constrained, priority-ordered, two passes)
- Respect the **hard dependency edges**: **platform core before any capability**, and **(3) Payments
  after (2) Metering** (soft pairing per ADR-004 decision 6). These are non-negotiable.
- Within those constraints, the **sequence of independent capabilities is a priority choice**, not a
  fixed order, and may be reordered per the first adopter's priorities. A reasonable default is:
  **platform core → (1) Production Monitoring (clean island, lowest-risk pattern-prover) → (2) Metering
  → (3) Payments → (6) Automation / (5) Field-Ops** (capability numbers per ADR-004 decision 5) — but
  e.g. an adopter who values Field-Ops over Metering may import it earlier, as long as the edges hold.
- **Two passes per module:** (a) move it in *working* (behavior-preserving), then (b) introduce the
  **port seam + capability flag**. Avoid generalizing while moving.
- Introduce the Tier-2 **port** so vendor code is optional, but defer a heavy adapter SPI until a second
  real adapter exists (cf. ADR-001).
- Sanity-check each group on arrival: dead code, dual-ORM usage, unused dependencies.

### Phase 4 — Configuration alongside import
- Each imported capability **registers its own flags/provider/integration config** (the three tiers,
  ADR-004 decision 6) into the Phase-1 skeleton as it lands. Config grows with the code, staying honest.

## Existing-company handling (the private deployment)

- Legacy `directives` / `lorawan-directives` are **retained transitionally** because historical orders
  reference them. They are clearly marked deprecated (no new writes; isolate read paths).
- Phase-out = archive / relink historical order references, then drop — an internal data migration that
  converges the company DB toward the OSS baseline. The *code* is identical to OSS throughout; the
  company DB is temporarily a superset.

## Exit condition (ends dual-track)

The public repo reaches **functional parity** with what the company needs → the company **cuts over** to
running the public repo → the **private repo is retired**. Keep this window deliberately short and
parity-driven to avoid drift (ADR-004 decision 1).

## Consequences

### Positive
- Preserves domain knowledge and git history; no big-bang rewrite risk.
- Clean, reviewable baseline schema free of dead/deprecated/company-specific noise — less developer
  confusion.
- Each phase is independently valuable and shippable; debt is paid down on a plan.
- Proven pipeline before domain code lands de-risks every later import.

### Negative / Risks
- Temporary coexistence of old (private) and new (public) structures until cutover; must be time-boxed.
- The init squash must be diff-verified against production or it can silently diverge.
- Deprecated-table phase-out for the existing company is real data-migration work, not just a drop.
- Two-pass import is more steps per module than a naive move; requires discipline to finish pass (b).

## Triggers (revisit when)
- Parity proves much further off than expected (reconsider scope/sequencing).
- A capability resists the two-pass import (signals a deeper coupling needing its own ADR).
- ADR-006 selects tooling that changes Phase-1 assumptions.

## Related
- **ADR-004** — target architecture (decisions 1, 3, 5, 6, 9).
- **ADR-006** — tooling/CI for Phase 1.
- **ADR-007** — config mechanism for Phases 1 & 4.
- **ADR-001** — when to extract adapter abstractions.
