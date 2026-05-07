# ADR-002a: Reconciliation Controller Pattern for Meter State

**Date:** 2026-05-07
**Status:** Proposed (design recommendation, not yet acted on)
**Crossroads:** [ADR-002](./002-crossroads-meter-state-management.md)
**Related:** [ADR-001](./001-push-pull-pattern-divergence.md)

---

## TL;DR

The meter-interactions stack needs a "smart" layer to (a) cancel redundant pending commands when a newer batch arrives, (b) make informed decisions on failed commands (retry vs. read-back vs. reclassify-as-success vs. open issue), and (c) reconcile drift between a meter's expected state and its actual state when nothing is pending.

**Recommendation:** build this as a **deterministic reconciliation/controller layer in pure backend code**, decomposed into three small services (Supersession, Failure Triage, State Reconciler) that compose existing primitives. **Use AI strictly off the hot path** — as an offline analyst surfacing new failure patterns and as an operator-facing triage assistant — never as the actor that issues commands to meters.

The shape of this problem is *not* "make a creative judgment call"; it is "diff desired state vs. actual state, apply policy, act idempotently." That is what controller patterns (Kubernetes, Terraform, every serious job runner) solve, and ~70% of the primitives are already in this repo.

---

## Context

### What the system does today

Tiamat manages communication with smart electricity meters from CALIN, currently over LoRa, LoRaWAN, and the CALIN HTTP API (V1/V2). The relevant layers, bottom-up:

1. **`device-messages`** — pure messaging; sends commands, parses responses, retries, owns the Redis queue pipeline.
2. **`meter-interactions`** — *intent* of what should happen at the meter (TOP_UP, TURN_ON, TURN_OFF, SET_POWER_LIMIT, READ_*, etc.) backed by the `meter_interactions` Postgres table.
3. **`directive-batches` / `directive-batch-executions`** — scheduled batch operations that fan out into many `meter_interactions` (e.g., turn all ~600 meters of a grid on/off, set a power limit, run a scan).

A `meter_interaction` lives through a status lifecycle:

```
QUEUED ─┬─► PROCESSING ─┬─► SUCCESSFUL
        │               └─► FAILED
SUSPENDED ◄─► QUEUED          ABORTED (terminal)
DEFERRED  ◄─► QUEUED
```

Statuses are grouped in `apps/tiamat/src/modules/meter-interactions/lib/meter-interaction-status-helpers.ts`:

- `pendingStatuses = ['QUEUED', 'SUSPENDED', 'DEFERRED']`
- `processingStatuses = ['PROCESSING']`
- `successfulStatuses = ['SUCCESSFUL']`
- `failedStatuses = ['FAILED', 'ABORTED']`
- `unfinishedStatuses = pending ∪ processing`

### The three problems we want to solve

#### Problem 1 — Redundant pending commands accumulate

When a new batch is scheduled but the previous batch has not finished, the new commands stack on top of the old ones in pending states. Two pathologies follow:

- **Noise.** Old commands are now redundant — they should not be executed. With multi-day comms outages we have observed thousands of obsolete pendings stack up.
- **Out-of-order execution.** An older `TURN_OFF` may still be ahead of a newer `TURN_ON` and execute later, leaving the meter in the wrong state.

Today, intake creates new interactions without examining or supersedeing pendings.

#### Problem 2 — Failure handling is ad hoc

When an interaction transitions to `FAILED`, the right next step depends on context that is not currently centralised:

- The command response sometimes returns "failed" but actually executed at the meter. This warrants a read-back rather than a retry.
- A `SET_POWER_LIMIT` failure on `CALIN_V1` is already followed up with a `READ_POWER_LIMIT` (see `interaction-after-effects.service.ts:117-126`) — this is the seed of triage logic but is currently hard-coded in a side-effect handler.
- Some failures are unrecoverable (`isFinal: true`, version-incompat) and should open an issue and stop.
- Transient NS errors should retry with backoff.
- A subsequent unsolicited `READ_REPORT` may already prove that a "failed" `TURN_OFF` actually succeeded.

#### Problem 3 — State drift with no pending commands

A meter's intent ("should be on", "power limit should be N") may diverge from its actual state for reasons unrelated to a pending interaction: a write succeeded but the meter rebooted, a manual intervention happened, an ABORTED interaction left things half-done, etc.

We want a periodic reconciler that closes this loop without spamming during outages.

A previous "watchdog" attempt existed (`apps/tiamat/src/modules/一directive-watchdog-sessions/` — entire file commented out) but never made it to production. The principal weaknesses of that attempt: no grid/gateway-level guardrails, no cool-off, no scoping to grids without active rule activity, no integration with the rest of the queueing pipeline.

---

## Options considered

### Option A — More conditional logic in existing services

Extend `MeterInteractionsService`, `InteractionGatekeeperService`, and `InteractionAfterEffectsService` with the new behaviour inline. Lots of nested `if`s, but no new abstractions.

**Pros:** minimal new structure; uses what we have.
**Cons:** the three concerns (supersession, triage, reconciliation) have meaningfully different lifetimes and triggers. Conflating them in existing services makes each harder to reason about and test. The current `interaction-after-effects` already shows the smell — `// @TODO :: Creating follow-up interactions as a side-effect should probably be its own method, not a side-effect of a side-effect 🎉` (line 116).

### Option B — LLM agent in the action path

Build an "AI layer" that is presented with the problem (current pendings, recent failures, meter state, grid state) and decides what to do, calling an internal API to create/cancel meter interactions.

**Pros:** flexible; leans on AI for messy, ambiguous cases; low up-front rule-engineering.
**Cons (decisive):**

- **Non-determinism at the action layer is operationally unsafe.** Today every interaction has a clean lineage (batch → execution → interaction → message). An LLM-issued action loses that audit trail. "AI decided to TURN_OFF" is not defensible in an incident review.
- **Hot-path latency/cost.** With CALIN API at 10–30s per call (see ADR-001) and reconciliation running continuously, LLM calls in the loop are the wrong shape for both cost and tail-latency.
- **LLMs are weak at exactly what this needs:** strict ordering, idempotency, numeric/temporal precision ("was the read ≥ 30s after the failed write?"), rate-limit math.
- **Most of the "smartness" is enumerable.** "Cancel old TURN_OFF if a newer TURN_ON for the same meter is pending" is a rule, not a judgment. So is "if `SET_POWER_LIMIT` fails on `CALIN_V1`, fire a `READ_POWER_LIMIT`" — which we already do.
- **Blast radius.** This system flips relays and sets power limits on hundreds of customer meters per grid. Probabilistic decisions there require elaborate guardrails — and those guardrails *are* deterministic rules, so we'd build the rules anyway.

If a rule is fuzzy enough that we genuinely need an LLM, it's almost always fuzzy enough that we want a *human* to confirm — meaning LLM-as-advisor, not LLM-as-actor.

### Option C — Reconciliation controller pattern *(recommended)*

Three small, focused, deterministic services backed by a clear declarative-intent model. Same shape as Kubernetes controllers, Terraform `apply`, or any robust job system: persist desired state, observe actual state, diff, apply policy.

**Pros:** matches the problem shape; auditable; testable; reuses existing primitives; clearly bounded surface area.
**Cons:** requires up-front design of supersession + triage policies (mitigated: most policies are already implicit in current code).

### Option D — Adjacencies (rejected)

- **Full workflow engine** (Temporal, Camunda). Overkill — the Redis pipeline + Supabase rows already are the workflow engine. Adding a second one doubles the surface area.
- **Event sourcing across the whole domain.** Tempting because reconciliation is event-y, but migration cost is huge and the timestamped state on `meters` + `meter_interactions` is enough to do diff-based reconciliation cleanly.
- **Hot-loaded eval'd rule code** (in the spirit of `AutopilotService`, which pulls JS from S3 and `eval`s it). Acceptable for an offline solver; *not* acceptable for code that drives meter relays. If hot-reloadable rules are ever wanted here, they should be a JSON/DSL policy registry, not eval'd JavaScript.

---

## Existing primitives to reuse

The repo already has most of what's needed. The recommendation builds on these — it does not replace them.

| Primitive | Location | Why it matters |
|---|---|---|
| `cancelOneByMeterInteractionId` / `cancelManyByMeterInteractionIds` | `device-messages/outgoing.service.ts:291,319` | Atomic ZREM-claim + cleanup. The hard part of supersession is already done. |
| `InteractionGatekeeperService.adjudicate` | `meter-interactions/interaction-gatekeeper.service.ts` | Existing guardrails (grid energised, gateway online, last-seen, version-specific unsupported ops) are exactly the inputs a reconciler needs to avoid spurious actions. |
| `GridDigitalTwinService` | `meter-interactions/grid-digital-twin.service.ts` | Real-time, debounced view of grid + gateway state with a `onTransition` listener. Perfect input to both the gatekeeper and the reconciler. |
| Desired-vs-actual columns on `meters` | `meters` table | `should_be_on` / `should_be_on_updated_at`, `power_limit_should_be` / `power_limit_should_be_updated_at` plus actuals (`is_on`, `power_limit`). This *is* the intent table for those two fields. |
| `reconcileSuspendedInteractions` | `meter-interactions/meter-interactions.service.ts:491` | Reconciliation pattern already proven, just for one status. The new reconciler is the same shape generalised. |
| `_doFollowUpInteraction` | `meter-interactions/interaction-after-effects.service.ts:232` | The seed of "do a read-back if a write fails." Should be moved into the triage service. |
| Structured `FailureReason[]` history | `device-messages/lib/types.ts:99-112` | `status`, `errorCode`, `details`, `isFinal`, `timestamp` — exactly the input a triage rule engine needs. |
| `audits` table | Supabase | Already used by `directive-batches`. Reuse it for supersession / triage / reconciliation actions with structured `reason` strings. |
| Priority inference | `meter-interactions/lib/interaction-context.ts` | `inferInteractionPriority` already accepts `followingUpOnType` to mirror priority. The triage service should set this for read-backs and retries. |
| `pendingStatuses` / `unfinishedStatuses` helpers | `meter-interactions/lib/meter-interaction-status-helpers.ts` | Update once when adding `SUPERSEDED`; the rest of the codebase picks it up via the helpers. |

---

## Domain model: intent vs. reality

Before introducing components, we make the implicit explicit.

### Intent

What we *want* the meter to be:

- **Per-field on `meters`** (already exists for two fields):
  - `should_be_on`, `should_be_on_updated_at`
  - `power_limit_should_be`, `power_limit_should_be_updated_at`
- **Implicit intent in pending interactions:** a `QUEUED`/`PROCESSING` `SET_POWER_LIMIT 12` row says "we want power limit to be 12" until that row resolves.

The intent on the `meters` row is the durable, source-of-truth view *across* interactions. The interaction is a *transient* attempt to realise the intent. Supersession and reconciliation operate on the durable view; pending interactions are the in-flight realisations.

For new control fields, we should keep extending this pattern (paired `*_should_be` / `*_should_be_updated_at` columns, or a dedicated `meter_intents` table if the field count grows beyond ~5–6).

### Reality

What the meter *is*:

- Field-level columns on `meters` (`is_on`, `power_limit`, `kwh_credit_available`, …) plus their `*_updated_at` counterparts.
- Updated by `interaction-after-effects.service.ts` on successful interactions, and by unsolicited `READ_REPORT` events for LoRaWAN meters.

### Drift

`drift = (intent ≠ reality) AND (no in-flight interaction reconciling them) AND (intent_updated_at + cooldown < now)`

The reconciler operates on drift. The triage service operates on a single failed interaction. The supersession service operates at intake.

---

## Recommended architecture

Three new services. Each one is small, focused, testable, and composes existing primitives.

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Sources of intent                              │
│  Batch (DirectiveBatchService)   User (controllers)   Reconciler      │
└─────────────┬──────────────────────────────┬─────────────────────────┘
              │                              │
              ▼                              ▼
   ┌──────────────────────────┐   ┌──────────────────────────────┐
   │ InteractionSupersession  │   │   InteractionGatekeeper       │
   │ Service (NEW)            │──►│   (existing)                  │
   │ - find conflicts         │   │ - QUEUED/SUSPENDED/DEFERRED   │
   │ - cancelMany in Redis    │   │   /ABORTED decision           │
   │ - mark DB rows SUPERSEDED│   └──────────────────────────────┘
   └──────────────────────────┘                  │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │  device-messages pipeline   │
                                  │  (existing)                 │
                                  └──────────────┬──────────────┘
                                                 │ outcome
                       ┌─────────────────────────┴─────────────────────────┐
                       │                                                   │
                       ▼ SUCCESSFUL                                        ▼ FAILED
       ┌─────────────────────────────┐               ┌────────────────────────────────────┐
       │ InteractionAfterEffects     │               │ InteractionFailureTriageService    │
       │ (existing, slimmed down)    │               │ (NEW)                              │
       │ - update meter actuals      │               │ - rule registry                    │
       │ - websocket / telegram /…   │               │ - decide: retry / readback /        │
       │ - close issues              │               │   reclassify_successful /          │
       └─────────────────────────────┘               │   open_issue / do_nothing          │
                                                     └────────────────────────────────────┘

                                                      ▲
                                                      │ periodic
   ┌───────────────────────────────────────────────────────┐
   │   MeterStateReconcilerService (NEW)                    │
   │   - cron, per grid, gated by digital twin              │
   │   - find drift rows, issue corrective interactions     │
   │   - context.fromReconciler = true                      │
   └───────────────────────────────────────────────────────┘
```

### Component 1 — `InteractionSupersessionService` (intake-time)

#### Purpose

Before creating a new `meter_interaction`, find pending interactions on the same meter that are made redundant by it, cancel them in Redis, and mark them `SUPERSEDED` in the DB.

#### Triggers

- `MeterInteractionsService._create` (covers user, commissioning, batch, after-effect follow-ups).
- `DirectiveBatchService.executeRule`, ideally *before* fanning out to `_create` so we batch-cancel for the whole grid in one Redis pipeline rather than one cancel per `_create`.

#### Policy registry

Data-driven, named, unit-tested. Sketch:

```ts
type SupersessionScope = 'meter' | 'meter+field';
type SupersessionPolicy = {
  supersedes: MeterInteractionTypeEnum[];
  scope: SupersessionScope;
  // Allows preserving same-batch ordering: a TURN_ON in batch X should
  // not supersede a TURN_OFF *from the same batch X*.
  preserveSameBatch?: boolean;
};

const SUPERSESSION_POLICIES: Record<MeterInteractionTypeEnum, SupersessionPolicy | null> = {
  TURN_ON:         { supersedes: ['TURN_ON', 'TURN_OFF'],     scope: 'meter', preserveSameBatch: true },
  TURN_OFF:        { supersedes: ['TURN_ON', 'TURN_OFF'],     scope: 'meter', preserveSameBatch: true },
  SET_POWER_LIMIT: { supersedes: ['SET_POWER_LIMIT'],         scope: 'meter+field', preserveSameBatch: true },
  TOP_UP:          null,    // never supersede pending top-ups, they each carry value
  CLEAR_CREDIT:    null,    // explicit, intentional
  READ_POWER:      null,    // reads do not supersede each other unless dedupe (see below)
  // …
};
```

Reads generally do not supersede; instead they *dedupe* — see "Idempotency" below.

#### Algorithm

For a new interaction `N` of type `T` on meter `M`:

1. Look up `policy = SUPERSESSION_POLICIES[T]`. If `null`, return.
2. Query DB for interactions on `M` where:
   - `meter_interaction_status IN unfinishedStatuses`
   - `meter_interaction_type IN policy.supersedes`
   - (if `preserveSameBatch`) `batch_execution_id IS NULL OR batch_execution_id != N.batch_execution_id`
3. For each conflict `C`:
   - Call `deviceMessageOutgoingService.cancelOneByMeterInteractionId(C.id)`. This may return `NOT_CANCELLABLE` (already in flight); that is fine — the device-message pipeline will resolve `C` normally and the after-effects can detect that `C` was superseded post hoc (see "Race conditions" below).
   - If cancellable, update DB: `meter_interaction_status = 'SUPERSEDED'`, append a `FailureReason` `{ reason: "Superseded by interaction #${N.id}", status: <prior>, timestamp: now }`.
4. Audit row: `audits.message = "<N> superseded N interactions in grid G"`.

#### Status enum addition

Add `SUPERSEDED` to `MeterInteractionStatusEnum`. Treat it as a terminal failure-ish status:

- Add to `failedStatuses` (it is not pending, not processing, not successful).
- Update the batch progress aggregator (`createBatchStatusCountMap`) to count `SUPERSEDED` as `failed` — or, better, add a `superseded` bucket and surface it separately in the UI so operators can see "we cancelled 200 redundant commands" rather than "200 failed".

The compile-time check `checkAllStatusesAreCovered` (lines 28–35 of the helpers file) will force every consumer to handle the new value — that's a feature, not a bug.

### Component 2 — `InteractionFailureTriageService` (post-failure)

#### Purpose

When a `meter_interaction` transitions to `FAILED`, decide what to do next. Replaces the inline follow-up logic that currently lives in `interaction-after-effects.service.ts`.

#### Trigger

Hooked into `MeterInteractionsService._onDeviceMessageEvent` immediately after the DB update, when the resolved status is `FAILED`. Runs *before* `interactionAfterEffectsService.blastoff` so triage decisions can be reflected in the after-effect emissions.

#### Rule registry

Each rule is a pure function: `(input) => Decision | null`. The service iterates rules in order, taking the first non-null decision.

```ts
type TriageInput = {
  interaction: MeterInteractionRow;
  meter: MeterForInteractionHandling;
  failureHistory: FailureReason[];
  recentReads: { type: MeterInteractionTypeEnum; result_value: any; created_at: string }[];
  gridTwin: GridDigitalTwin | undefined;
};

type TriageDecision =
  | { action: 'reclassify_successful'; reason: string; result_value?: Json }
  | { action: 'retry'; reason: string; cooldownMs: number; maxAttempts: number }
  | { action: 'readback'; reason: string; readbackType: MeterInteractionTypeEnum }
  | { action: 'open_issue'; reason: string; issueType: IssueTypeEnum }
  | { action: 'do_nothing'; reason: string };

type TriageRule = {
  name: string;
  match: (input: TriageInput) => TriageDecision | null;
};
```

#### Concrete rules to ship initially

In approximate priority order (first match wins):

1. **`reclassify-on-recent-confirming-read`** — if a `READ_REPORT` (LoRaWAN) or a recent successful read in the last 60s shows the post-condition the failed write was trying to achieve, reclassify the interaction as `SUCCESSFUL`.
2. **`final-failure-stops`** — if the most recent `FailureReason.isFinal === true`, return `do_nothing` with `open_issue` for `METER_STATE_BAD_CONFIGURATION` or version-incompat reason. (Mirrors today's `ABORTED` "isFinal" path.)
3. **`set-power-limit-readback-calin-v1`** — port today's inline behaviour from `interaction-after-effects.service.ts:117-126` here, with a `readbackType: 'READ_POWER_LIMIT'`.
4. **`turn-on-off-readback`** — if `TURN_ON`/`TURN_OFF`/`SET_POWER_LIMIT` failed and the last successful `READ_REPORT`/`READ_CREDIT` is older than the failure (i.e., we have no fresh evidence either way), schedule a read-back instead of a retry. Cheaper and tells us truth.
5. **`transient-retry`** — if the failure status was `TO_RETRY` exhausted but the `errorCode` indicates transient NS issue (timeout, gateway temp-down, 5xx) and `retry_count < maxAttempts`, schedule a retry with backoff.
6. **`fallthrough-open-issue`** — anything else: open an `UNEXPECTED_*` issue and stop.

Each rule is unit-tested in isolation.

#### Output side-effects

- `reclassify_successful`: update the row to `SUCCESSFUL` (and set `result_value` if provided) before `blastoff` so the after-effects update the meter actuals correctly.
- `retry`: schedule via existing retry mechanics (`enqueueReleased` style) with backoff.
- `readback`: create a new interaction with `context.followingUpOnType = <original.type>` so priority mirrors the original (the existing `inferInteractionPriority` already supports this).
- `open_issue`: insert into `issues`. Mirrors the existing closure logic in `closeLatestIssueIfNeeded` but in the open direction.
- `do_nothing`: still write an audit so we can prove we considered the case.

### Component 3 — `MeterStateReconcilerService` (drift detection)

#### Purpose

Periodically detect meters where intent ≠ reality with no pending or processing interaction, and issue a corrective interaction. This is the "watchdog done right" — same idea as the abandoned `一directive-watchdog-sessions`, but built on the `GridDigitalTwinService` and `InteractionGatekeeperService` it could not lean on at the time.

#### Trigger

Cron (start at every 15 minutes; configurable per grid). Skip immediately if a session is already running (mirror `isSessionRunning` from the old watchdog).

Optionally also reactive: subscribe to `GridDigitalTwinService.onTransition` to trigger a one-shot reconciliation when a grid recovers (already wired for `reconcileSuspendedInteractions`).

#### Eligibility filter (per grid)

- `gridTwin.is_energised === true`.
- For LoRaWAN: `gridTwin.is_any_lorawan_gateway_online === true`.
- No active `directive_batch_executions` in the last hour AND no `directive_batches` scheduled within the next hour for this grid (avoid stepping on planned activity — same idea as the old watchdog's `gridsWithNoActivityInTheLastHours`).

#### Per-meter filter

- Not `is_manual_mode_on`.
- Last commissioning is `SUCCESSFUL` (we don't reconcile partially commissioned meters; commissioning has its own resumption flow).
- Drift exists for at least one tracked field, and `now - intent_updated_at > FIELD_COOLDOWN_MS` (e.g., 10 minutes — give in-flight comms a chance).
- No `unfinishedStatuses` interaction on this meter for the same field.
- No reconciler-issued interaction in the last `RECONCILER_PER_METER_COOLDOWN_MS` (e.g., 60 minutes) — back off from meters that resist reconciliation rather than spam them.

#### Action

Create the corrective interaction with:

```ts
context: { fromReconciler: true }
```

Extend `InteractionContext` with `fromReconciler?: boolean`. Extend the gatekeeper to throttle/skip when set if any of the eligibility checks have flipped between the cron tick and the create call.

#### Failure mode of the reconciler itself

If the corrective interaction fails, the failure-triage service handles it. If it keeps failing across multiple cron cycles, the per-meter cooldown above prevents amplification, and an `UNEXPECTED_METER_STATUS` / `UNEXPECTED_POWER_LIMIT` issue is opened by triage's fallthrough rule. Operator-visible. Not silent.

---

## Where AI fits — specifically and only here

Once the deterministic core is in place, AI gives high leverage *off the hot path*. None of these touch the action flow.

### 1. Nightly failure-pattern analyst (recommended, high leverage)

A scheduled job (Tiamat cron or a separate Yeti task) that:

- Pulls the last 24h of `FAILED`/`ABORTED`/`SUPERSEDED` interactions.
- Groups by signature: `(meter_interaction_type, communication_protocol, meter.version, last FailureReason.errorCode, last FailureReason.status, isFinal)`.
- Sends grouped summaries to an LLM with a prompt: "Identify novel patterns relative to a baseline of N days; suggest triage rules; flag clusters that look like a new firmware bug."
- Posts the report to Telegram / a dashboard.

Read-only, advisory, drives ADRs and new triage rules. Cheap, can use a small model.

### 2. Operator-facing triage assistant (Telegram)

Use the existing `TelegramService`. When a meter has been stuck (e.g., reconciler cooldown reached, or > K failed interactions in a window), the bot:

- Summarises the situation and links to the rows.
- Suggests an action (retry / readback / mark resolved / open ticket).
- Operator clicks; deterministic system executes.

Human in the loop. Never auto-acts.

### 3. (Optional, later) Codegen of new triage rules

When the analyst surfaces a recurring pattern, an LLM drafts a new `TriageRule` (matcher + decision) as a PR with tests. Reviewed and merged like any other code. The bar to *deploy* a rule is normal code review — no eval'd code, no live mutation of policy.

### Things AI explicitly does not do

- It does not call `cancelOneByMeterInteractionId`, `enqueueReleased`, `createOneForMeter`, or any other action.
- It does not decide live retry/readback/reclassify decisions.
- It is not in the request path.

---

## Cross-cutting concerns

### Observability and auditability

Every supersession, triage decision, and reconciliation action writes:

1. A row to `audits` with a structured `reason` string and the actor type (`'supersession' | 'triage' | 'reconciler'`).
2. An entry to the affected interaction's `delivery_failure_history` (where applicable).
3. A websocket event so the dashboard reflects the change (`websocketService.emitMeterInteraction`).

Goal: any "why is this meter off?" question is answerable by reading rows, not by re-running the system.

### Idempotency and race conditions

Two non-trivial races deserve explicit treatment.

#### Race A — supersession vs. distributor

`cancelOneByMeterInteractionId` uses ZREM as an atomic claim. If the distributor or reaper has already picked up the message, ZREM returns 0 and we leave it alone. The DB row therefore *cannot* be unconditionally marked `SUPERSEDED`.

**Resolution:**

- Mark DB `SUPERSEDED` only when `cancelOneByMeterInteractionId` returns `CANCELLED`.
- For `NOT_CANCELLABLE` outcomes, leave the row as-is. The pipeline will resolve it normally; in `_onDeviceMessageEvent`, after the row resolves to `SUCCESSFUL`/`FAILED`, the after-effects can detect "this was superseded post hoc" by checking whether a newer interaction of conflicting type exists for the same meter — and decide whether to skip downstream side-effects (e.g., do not update `meters.is_on` from a now-superseded `TURN_OFF`).
- For `NOT_FOUND` outcomes (no Redis message), the row is in DB-only states — `SUSPENDED`/`DEFERRED` — and can be marked `SUPERSEDED` directly.

#### Race B — reconciler vs. concurrent intent

Between the reconciler's "find drift" query and "create corrective interaction", a user, a batch, or a commissioning may have created a fresh interaction for the same field. The fix is the same as elsewhere in the system: the supersession service runs at create time, so the *user-driven* one supersedes the reconciler's, or vice versa, deterministically based on timestamps.

To make this strictly correct, the reconciler should pass `intent_updated_at` of the field it's reconciling and the supersession policy should refuse to create the reconciler interaction if a newer interaction (or a newer intent) already exists.

#### Idempotency / dedupe on read interactions

Reads do not supersede, but they should **dedupe**. Before creating a new `READ_*`, check whether an identical pending read on the same meter exists; if so, attach the new caller to the existing row (e.g., via `batch_execution_id` or a list of requesting batches) instead of creating a duplicate. Saves a lot of meter traffic during scans.

### Status enum migration

Adding `SUPERSEDED`:

1. Supabase migration to extend the enum.
2. Update `MeterInteractionStatusEnum` typing import (Supabase types regen).
3. Update `meter-interaction-status-helpers.ts`:
   - Add to `failedStatuses` (or a new bucket if we want UI separation).
   - The `checkAllStatusesAreCovered` will catch every missed branch at compile time.
4. Audit and update consumers found via the type system.
5. UI surfacing in dashboards.

### Feature flagging and rollout

Roll out per grid:

- `grids.config.reconciliation_mode`: `OFF` / `SHADOW` / `ON`.
- In `SHADOW` mode the reconciler logs the corrective interaction it *would* have issued, audits it, but does not enqueue. Operators compare predictions to ground truth before flipping `ON`.
- The same `SHADOW` mode is valuable for supersession during initial rollout: log "would have superseded N interactions" without actually cancelling, for one or two release cycles.

### Performance

- Supersession at intake: O(P) DB lookup per new interaction where P = pendings on that meter (typically 0–2). Negligible. For batch fan-outs of 600 meters, the supersession lookup should be batched into one query keyed by `meter_id IN (...)`.
- Triage at FAILED: rule matching is in-memory and cheap; the cost is the optional fetch of recent reads, which can be cached per-meter for the duration of triage.
- Reconciler: per-grid cron with eligibility filtering keeps the working set small. The query is the same shape as `reconcileSuspendedInteractions` already running in production.
- Redis cancel of large supersession sets: `cancelManyByMeterInteractionIds` notes the O(N) round-trip cost (lines 309–315 of `outgoing.service.ts`). For grid-scale supersessions of hundreds of IDs, implement the suggested MGET/pipeline batching in the lookup phase before this lands in production.

### Testing strategy

- **Unit tests** for every supersession policy and every triage rule. Pure functions, table-driven.
- **Integration tests** at the `MeterInteractionsService._create` boundary covering supersession in scenarios: same-batch, cross-batch, in-flight, terminal-already.
- **Reconciler tests** with a stubbed `GridDigitalTwinService`: drift exists / does not exist / pending-blocks / cooldown-blocks / outage-blocks.
- **End-to-end smoke** on a single dev grid in `SHADOW` mode for a release cycle, comparing predicted to actual.

---

## Implementation roadmap

In order. Each step is independently shippable and provides value alone.

1. **ADR-002a merge** (this document).
2. **Status enum: add `SUPERSEDED`.** Migration + helpers + UI surfacing. Zero behaviour change yet.
3. **`InteractionSupersessionService` v1 (shadow mode).** Wire into `_create` and `executeRule`; log decisions; audit; do not actually cancel/mutate. Run for one release cycle on at least one grid.
4. **Supersession enable.** Flip `SHADOW → ON` per grid; observe; expand.
5. **Read-interaction dedupe.** Small extension to the supersession service (different policy, same machinery).
6. **`InteractionFailureTriageService` v1.** Move the inline `SET_POWER_LIMIT`/`READ_POWER_LIMIT` follow-up into the new service. No new behaviour; just a clean extraction with tests.
7. **Triage rule expansion.** Add `reclassify-on-recent-confirming-read`, `final-failure-stops`, `transient-retry`, `fallthrough-open-issue`. Each as a separate small PR with tests.
8. **`MeterStateReconcilerService` v1 (shadow).** Cron, gated, drift detection, log-only. One grid first.
9. **Reconciler enable.** Per-grid, with operator visibility.
10. **AI analyst job (offline).** Nightly summary to Telegram.
11. **AI triage assistant (Telegram bot).** Operator-confirmed actions only.

A reasonable first sprint is steps 1–3. The whole roadmap is on the order of 4–8 weeks of focused work, depending on test coverage we want around it.

---

## Open questions / risks

- **Generalising intent beyond `is_on` and `power_limit`.** If we expand reconciliation to credit balance, version, tamper status, etc., we should consider a `meter_intents` table rather than continuing to add `*_should_be` column pairs on `meters`. Decision can be deferred until we have a third or fourth field.
- **Cross-grid supersession.** Currently supersession is `meter`-scoped. Are there grid-wide policies where a `SET_POWER_LIMIT` for the whole grid should supersede a single-meter `SET_POWER_LIMIT`? Needs domain input.
- **Commissioning interactions.** Commissioning has its own ordered sequence (`COMMISSIONING_COMMAND_SEQUENCE` in `interaction-context.ts`). Supersession must explicitly *not* cross commissioning boundaries — i.e., a non-commissioning `TURN_OFF` should not supersede a commissioning-time `TURN_OFF`. The `meter_commissioning_id` column makes this trivial to express in the policy.
- **Three-phase reads.** Phase aggregation (`_handleThreePhaseResponse`) interacts with triage: a partial-phase failure is genuinely different from a full failure. Triage rules need to consider the aggregated `result_value.phase` map.
- **Token regeneration on retry.** `_maybeGenerateToken` has a `// @TODO :: Do token retries too`. Triage's `retry` action must regenerate the token for STS-token interactions when retrying — this is currently absent in `retryOne`.
- **Reconciler vs. autopilot.** `AutopilotService` decides FS toggle states based on forecasts and writes back via `should_fs_be_on`. The reconciler should *not* fight autopilot; the relationship is "autopilot sets intent, reconciler enforces it." Document this contract explicitly when wiring up.

---

## Triggers to revisit this ADR

Revisit this document when:

- Adding a new manufacturer or protocol that has fundamentally different failure semantics.
- The triage rule registry grows past ~25 rules — consider a rule DSL with priorities and a richer matcher.
- The `meters` table accumulates a fifth `*_should_be` column pair — consider migrating to a `meter_intents` table.
- An LLM-driven action layer is being seriously reconsidered — the rationale in "Option B" should be re-evaluated against the failure modes observed in practice.
- The `SHADOW` mode for any of the three new services has been on for more than two release cycles without a green-light decision — figure out why.

---

## Glossary

- **Intent.** What we want the meter to be (per-field, durable on the `meters` row).
- **Reality.** What the meter currently is (per-field, durable on the `meters` row, updated by successful interactions and unsolicited reports).
- **Pending interaction.** A `meter_interaction` row in `QUEUED`, `SUSPENDED`, or `DEFERRED`.
- **In-flight interaction.** A `meter_interaction` whose corresponding `device_message` is past `QUEUED`/`TO_RETRY` in the Redis pipeline (cannot be cleanly cancelled).
- **Supersession.** Marking an obsolete pending interaction as `SUPERSEDED` because a newer interaction makes it redundant.
- **Dedupe.** Skipping creation of a new interaction because an identical pending one already exists; attaching the new caller to the existing row.
- **Drift.** `intent ≠ reality AND no in-flight interaction reconciling them AND outside cooldown`.
- **Triage.** Choosing what to do after an interaction transitions to `FAILED`.
- **Reconciler.** Periodic process that detects drift and issues corrective interactions.
- **Digital twin.** In-memory cached view of grid + gateway operational state, debounced through a stability window.
