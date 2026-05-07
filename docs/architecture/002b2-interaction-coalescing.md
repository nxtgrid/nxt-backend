# ADR-002b2: Interaction Coalescing and Batch Redundancy Elimination

**Date:** 2026-05-07
**Status:** Proposed
**Crossroads:** [ADR-002](./002-crossroads-meter-state-management.md)
**Previous in path:** [ADR-002b1](./002b1-device-shadows.md)
**Next in path:** [ADR-002b3](./002b3-reconciliation-loop.md)

## Context
"Batch" operations (e.g., turning off 600 meters) currently create 600 individual `meter-interactions`. If multiple batches are scheduled consecutively or if communications are down, these commands pile up. This creates "buffer bloat," consumes database resources, and risks flooding the LoRa network with redundant or contradictory commands once connectivity is restored.

## Current State
* 1:N relationship between Batches and Interactions.
* No deduplication: Scheduling a "Read Voltage" batch twice results in two physical downlink messages.
* Stale analytics commands persist indefinitely even if the data is no longer relevant.

## Options Considered
1. **Imperative Batching (Current):** Continue creating unique interactions per batch.
2. **Batch-Interaction Junction Table (Recommended):** Shift to an M:N relationship to allow "Coalescing."

## Recommendation
Implement **Interaction Coalescing** to ensure that one physical command on the wire can satisfy multiple logical requests.

### Key Mechanisms
1. **Junction Table (`batch_to_interactions`):** Remove `batch_id` from the interaction table. Link multiple batches to a single interaction ID.
2. **Deduplication Logic:** Before creating an interaction, the service checks for an existing `QUEUED` interaction of the same type for that meter. If found, it simply attaches the new Batch ID to that interaction.
3. **Analytics TTL:** Assign a Time-to-Live (e.g., 30 minutes) to read-only interactions. The message layer will auto-discard expired jobs.
4. **Supersede Logic:** If a new control intent (e.g., Turn ON) is registered, any `QUEUED` interactions for the same attribute that contradict it (e.g., Turn OFF) are marked as `SUPERSEDED`.

## Trigger
This ADR is triggered by the 1000s of redundant commands piling up during LoRa gateway downtime.
