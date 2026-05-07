# ADR-002: Crossroads — Meter State Management Architecture

**Date:** 2026-05-07
**Status:** Decision Pending
**Related:** [ADR-001](./001-push-pull-pattern-divergence.md)

---

## Context

As the platform scales, three tightly coupled problems have emerged around meter state management:

1. **Redundant pending commands** — consecutive batches stack on each other, bloating the queue with contradictory or stale interactions.
2. **Lossy failure handling** — failed or timed-out commands are blindly retried without verifying whether the meter actually acted on the command ("ghost success").
3. **State drift** — no automated mechanism reconciles the difference between what a meter *should* be doing and what it *is* doing.

Two architectural paths have been proposed to address these problems. Both are documented under this umbrella and remain `Proposed` pending a decision.

---

## Path A — Reconciliation Controller Pattern

**File:** [002a-reconciliation-controller-pattern.md](./002a-reconciliation-controller-pattern.md)

A single, holistic proposal that builds a deterministic controller layer on top of existing primitives. Decomposed into three focused services (Supersession, Failure Triage, State Reconciler) that operate within the current data model. Inspired by the Kubernetes controller pattern.

**Characteristics:**
- Lower upfront migration cost — no schema changes required to start
- All logic lives in backend code, not the database
- AI is kept strictly off the hot path

---

## Path B — Device Shadows + Coalescing + Reconciliation Loop

Three modular ADRs that each address one layer of the problem, intended to be adopted in sequence:

1. **[002b1 — Device Shadows](./002b1-device-shadows.md):** Introduces a `meter_shadows` table with `desired_state` / `reported_state` JSONB blobs as a "digital twin" of the physical hardware. Decouples intent from reality at the schema level.
2. **[002b2 — Interaction Coalescing](./002b2-interaction-coalescing.md):** Shifts the batch-to-interaction relationship from 1:N to M:N, enabling deduplication of commands and TTL-based expiry of stale analytics interactions.
3. **[002b3 — Reconciliation Loop](./002b3-reconciliation-loop.md):** A background watchdog that converges `desired_state` → `reported_state`, handles ghost successes via read-after-fail verification, and recovers suspended meters cleanly.

**Characteristics:**
- Higher upfront investment — requires schema migration and data model changes
- Cleaner long-term separation of concerns (schema, data model, background logic)
- Each step is independently deployable and reviewable

---

## Decision

_Not yet made. Both paths are kept as `Proposed` until a decision is reached._
