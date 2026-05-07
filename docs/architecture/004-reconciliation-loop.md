# ADR-003: State Reconciliation Loop (Watchdog 2.0) and Verification

**Date:** 2026-05-07
**Status:** Proposed

## Context
LoRaWAN communications are lossy and high-latency. A command may be successfully executed by a meter, but the acknowledgment (ACK) may fail to reach the server (a "Ghost Success"). Conversely, manual changes or localized hardware resets can cause the meter to drift from its "Desired State." Previous attempts at a watchdog failed due to a lack of integration with the command flow.

## Current State
* Command execution relies on simple Success/Fail responses from the lower layer.
* Failure often triggers a blind retry of the same command, which may be redundant.
* Discrepancies are reported in the UI but not automatically resolved by the backend.
* There is no awareness of "in-flight" commands when determining if a reconciliation action is needed.

## Options Considered
1. **AI-Driven Decision Layer:** Use an LLM to decide on retries based on logs. (Rejected: Non-deterministic and potentially dangerous for critical infrastructure).
2. **Declarative Reconciliation Loop (Recommended):** A logic-based "Controller" pattern inspired by Kubernetes controllers.

## Recommendation
Implement a **State Reconciliation Loop** that acts as an automated, self-healing watchdog.

### Key Mechanisms
1. **Convergence Loop:** A background worker (Reconciler) periodically compares `reported_state` vs `desired_state` in the `meter_shadows` table. If they differ and no interaction is currently "In-Flight," it triggers a reconciliation interaction.
2. **Read-After-Fail Verification:** If a control command (e.g., Turn ON) returns a "Failure" or "Timeout," the system will not retry the write immediately. Instead, it moves to a `VERIFYING` state and issues a `READ` command to verify if the state actually changed despite the missing ACK.
3. **Zombie Command Handling:** If a command is already in the lower layer (e.g., in a Network Server queue) and cannot be canceled, the loop yields. If that "zombie" command ultimately sets the meter to a state that contradicts the current intent, the loop will detect the new discrepancy in the next cycle and issue a corrective command.
4. **Suspension Recovery:** When a meter transitions from `SUSPENDED` back to `ACTIVE`, the loop performs a "Clean Slate" purge of stale interactions before issuing a single fresh synchronization command to bring the meter to its intended state.

## Trigger
This ADR is triggered by the requirement to handle "Ghost Success" scenarios and the need for a deterministic, automated way to resolve state drift across thousands of solar mini-grid meters.
