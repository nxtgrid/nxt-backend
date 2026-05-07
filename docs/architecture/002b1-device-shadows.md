# ADR-002b1: Implementation of Declarative Device Shadows for State Management

**Date:** 2026-05-07
**Status:** Proposed
**Crossroads:** [ADR-002](./002-crossroads-meter-state-management.md)
**Next in path:** [ADR-002b2](./002b2-interaction-coalescing.md)

## Context
The current system manages meter states (e.g., relay status, power limits) directly within the main `meters` table. Intent and actual state are stored as individual columns (e.g., `is_on` vs `should_be_on`). As the platform scales, this "broad table" approach is becoming difficult to maintain. Furthermore, there is no centralized mechanism to reconcile the difference between intent and reality, leading to out-of-sync meters and a lack of clear visibility into "in-flight" changes.

## Current State
* Meter state is a "flat" structure within the `meters` table (e.g., `is_on`, `should_be_on`, `is_on_updated_at`).
* Reporting and Intent are coupled in a single high-traffic table.
* Hard to track which specific attribute is currently being modified by an active command (e.g., a "Turn On" command vs a "Set Power Limit" command).

## Options Considered
1. **Maintain Current State:** Continue adding columns to the `meters` table. (Rejected: High risk of table locks and data bloat).
2. **Individual State Tables:** Create separate tables for every attribute (e.g., `relay_states`, `power_limit_states`). (Rejected: Excessive joins).
3. **JSONB Device Shadows (Recommended):** Use a 1:1 "Shadow" table with JSONB blobs for state tracking.

## Recommendation
Implement a `meter_shadows` table to act as the "Digital Twin" of the physical hardware.

### Proposed Schema
* `meter_id`: PK/FK to `meters`.
* `reported_state`: JSONB tracking the last known values from the hardware (e.g., `{"relay": "ON", "voltage": 230}`).
* `desired_state`: JSONB tracking the intent set by the system/user (e.g., `{"relay": "OFF", "power_limit": 5000}`).
* `metadata`: JSONB tracking attribute-level timestamps and active interaction IDs.

## Trigger
This ADR is triggered by the need to resolve state discrepancies and reduce the complexity of the core `meters` table.
