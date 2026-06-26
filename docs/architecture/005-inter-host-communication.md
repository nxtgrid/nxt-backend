# ADR-005: Inter-Host Communication

**Date:** 2026-06-26
**Status:** Open (deferred from ADR-004; to be resolved in a dedicated session)

---

## Purpose of this document

This is a **scoped stub** so the question can be picked up later in its own conversation with full
context. It records the problem, the current state, the options, and the constraints inherited from
ADR-004 — but does **not** yet make a decision.

## Inherited context (from ADR-004)

- Single-track open source, one monorepo, **modular monolith** with capability modules on thin
  runtime hosts.
- Default hosts: **`api`** (tiamat + folded talos) and **`worker`** (background/collector domains),
  with worker composition **config-driven along capability seams**.
- Decomposition principle: a separate deployable is justified **only by a divergent runtime profile**.
- Configuration is **per-deployment**.

## The question

How should runtime hosts (and any future split-out services such as device-messaging) communicate —
efficiently and generically — especially when co-hosted on the same platform?

## Current state (as observed)

The apps are coupled **two ways at once**:

1. **Shared databases (dominant coupling):** all apps connect to the *same* primary DB twice —
   `NXT_DB_*` (legacy TypeORM) **and** `SUPABASE_*` (Supabase client) — plus the same
   `NXT_TIMESCALE_DB_*`. The database is effectively the integration bus today.
2. **HTTP mesh (secondary):** `tiamat` holds `TALOS_API` / `YETI_API` / `LOCH_API`; `loch` and `yeti`
   each hold `TIAMAT_API` + `TIAMAT_API_KEY`. A bidirectional, API-key-authenticated HTTP mesh sits on
   top of the shared DB.

Note: `iovalkey` (a Valkey/Redis client) is already a dependency, and Socket.IO/WebSockets are in use.

## Options to consider (not yet decided)

1. **In-process calls when co-located.** Because of the modular monolith, many cross-host "calls"
   collapse into direct service calls inside the same process once capabilities are wired onto a host.
   Reduces the mesh to only genuinely cross-process interactions.
2. **Shared DB as the integration bus.** Lean on the database (and/or Postgres `LISTEN/NOTIFY`) for
   coordination. Simple, no new infra, but couples hosts through schema and can hide implicit contracts.
3. **Internal event bus.** Introduce Valkey/Redis (already a dependency) or a lightweight broker for
   pub/sub between hosts. Decouples producers/consumers; adds infra a self-hoster must run.
4. **Keep/standardize the HTTP mesh.** Formalize internal APIs with typed contracts and shared API
   keys. Familiar, but adds network hops and an availability dependency between hosts.

## Constraints / evaluation criteria

- **Self-hostability:** every added piece of infra is a burden on the default operator; prefer the
  smallest viable footprint (see ADR-004 lean-default goal).
- **Genericness:** the chosen mechanism must not hardcode NXT-specific topology.
- **Co-location efficiency:** avoid unnecessary network hops when hosts run on the same platform.
- **Capability boundaries:** communication should respect the capability seams from ADR-004.

## To decide in the dedicated session

- The default communication mechanism (and when it is allowed to differ).
- Whether to remove or formalize the existing HTTP mesh.
- Whether an event bus is justified for the OSS baseline or is an opt-in for larger deployments.
- How co-located vs distributed hosts are abstracted so code does not care which it is.
