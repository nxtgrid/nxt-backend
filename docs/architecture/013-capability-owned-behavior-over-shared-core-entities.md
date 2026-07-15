# ADR-013: Capability-Owned Behavior over Shared Core Entities

**Date:** 2026-07-15
**Status:** Accepted

---

## Context

ADR-004 establishes a modular monolith: a lean always-on **platform core** (reconciled to
**Foundation** during the 002d import — see `docs/plans/002-oss-migration/002d-platform-core-import.md`)
plus **capability modules** gated by config. Foundation owns the shared identity/data graph
(organizations → grids → sites, accounts, members, api-keys); capabilities (metering, payments,
production, …) are turned on and off per deployment.

This raises a recurring design question, first surfaced while scoping the `grids` import (002d):
**where does behavior that *involves* a core entity but *belongs* to a capability live?** A `grid`
row is Foundation data, but "grid connectivity statistics" is a *metering* concern that merely
reads grids. The tempting-but-wrong answer is to let the core `grids` module grow metering methods
that light up when metering is enabled. Two concrete framings drove the decision:

- *"When an adopter turns metering on, does the grid suddenly gain more methods?"*
- *"If an adopter runs metering but does not want historical connectivity data persisted to
  Timescale (cost), how does that split?"*

Both are really the same question about **module boundaries**, and the wrong resolution leaks
capability logic into core, couples core to capabilities (inverting the dependency direction), and
makes disabled-capability behavior a conditional inside always-on code rather than simply-absent.

This ADR is deliberately **guiding for all future development**, not just the migration.

## Decision

### 1. Behavior follows domain ownership, not the entity

Core entities are shared **data**. Behavior that is specific to a capability lives in the
**owning capability**, which reads/writes the shared core data — it is **never** bolted onto the
core module. Core modules expose the entity's own identity/CRUD (create/read/update/list of the
row itself); everything a capability *does* with that row lives on the capability's surface.

**Worked example (grids):** Foundation's `grids` module owns grid CRUD/read. Metering owns
connectivity statistics and exposes them on its **own** surface (e.g.
`GET /metering/grids/:id/connectivity` from within the metering module), reading the shared grid
data. Grids-core stays lean; it does not import or know about metering.

### 2. No conditional-unlock methods on core modules

A core module's surface does not change based on which capabilities are enabled. Behavior is not
"unlocked" on core when a capability turns on — the capability module simply *is or is not
composed* (Tier-1 gating, ADR-007). When a capability is off, its endpoints/services do not exist
because the module was never wired, not because a branch inside core skipped them. The dependency
edge always points **capability → core**, never the reverse.

### 3. Split capabilities along cost/independence seams, not by entity

When a capability has parts an adopter may legitimately want independently, split it into
**cohesive sub-modules along that seam** — not by threading options through a shared entity's
module. Illustrative: metering that persists historical connectivity data to Timescale vs. metering
that does not splits into a `metering` module and a `metering-monitoring` module (the latter owning
the Timescale persistence). The `grid` entity gains nothing in either case; the seam lives in the
capability layer where the cost/independence actually is.

### 4. No plugin/extension registry in the baseline

Core does not ship a registry that capabilities register behavior into (a plugin bus, a
`registerGridAction()`-style hook, etc.). That is an indirection with no current need and it
re-introduces the core→capability coupling this ADR removes. Composition is explicit and static
per host (ADR-007 §7 as amended). Revisit only if a real extensibility requirement appears (see
Triggers).

## Consequences

### Positive

- Core stays lean, stable, and free of capability knowledge; the dependency graph is acyclic
  (capability → core only).
- Disabled capabilities are genuinely absent (smaller surface, fail-fast at boot), not dormant
  branches inside always-on code.
- "Whole-module vs split-module" for future imports has a principled answer: split along
  cost/independence seams in the capability layer.
- Behavior is discoverable by domain: to find what the platform *does* with a grid, look in the
  owning capability, not in an ever-growing core module.

### Negative / Risks

- A capability that reads core data must go through core's surface/services rather than reaching
  into core internals — a little more ceremony than a single fat module.
- Requires judgment at import time to route entangled legacy behavior to the right owner (mitigated
  by the migration's per-behavior import ledger and "no-cracks" governance in the roadmap).
- Some cross-capability data needs (e.g. payments reading metering facts) surface as soft pairings
  (ADR-004 decision 6), which must degrade gracefully rather than hard-couple.

## Related

- **ADR-004** — capability map and Tier-1 gating; §5 (as amended) narrows platform core so that
  capability-specific modules (agents, dcus, poles, websocket, routers, download) are *not*
  Foundation.
- **ADR-007** — configuration & wiring; §7 (as amended) explicit static per-host composition is the
  mechanism that makes disabled capabilities simply-absent.
- **002d — Platform Core Import** — first application of this principle (grids is a partial import;
  metering-coupled grid behavior is re-homed to Metering, not restored to core).

## Triggers (revisit this ADR when)

- A genuine third-party/extension requirement appears where external code must add behavior to a
  core entity without modifying core (reconsider decision 4's "no registry").
- A capability seam cannot be expressed as cohesive sub-modules and genuinely needs per-entity
  optionality (reconsider decision 3).
- Two capabilities need to share non-core behavior over the same entity (introduce a shared
  capability or a port, rather than pushing behavior down into core).
