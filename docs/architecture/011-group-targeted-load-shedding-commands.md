# ADR-011: Group-Targeted Load-Shedding Commands

**Date:** 2026-07-09
**Status:** Proposed
**Related:** [ADR-002](./002-crossroads-meter-state-management.md), [ADR-002a](./002a-reconciliation-controller-pattern.md)

---

## TL;DR

"FS control" today is a hardcoded binary concept: `meter_command_batches.fs_command` (`ON`/`OFF`) is a
second, parallel "purpose" column alongside `command_type` (formerly `task_type`), and execution
branches at runtime on `grid.uses_dual_meter_setup` to decide whether "FS off" means cutting a relay
(`TURN_ON`/`TURN_OFF`) or throttling a shared meter to zero (`SET_POWER_LIMIT`). This conflates four
things that should be independent: *which command* runs, *what value* it carries, *which meters* it
targets, and *how a grid is wired*.

**Decision:** collapse `fs_command` into `command_type` (one column, typed as the existing
`meter_interaction_type_enum`), replace the implicit ON/OFF-to-value translation with an explicit,
generic `command_payload` (JSONB, static-or-resolved), and replace the implicit
`uses_dual_meter_setup` branching with an explicit `target_meter_type` filter. Full flexible
meter-grouping (by tariff, connection type, location, …) is intentionally deferred — this ADR
establishes the mechanism it will plug into without committing to *how* group membership is computed.

This is a pure generalization: "turn FS on" becomes "`SET_POWER_LIMIT`, value `0`, target `FS`" — no
functionality is lost, and the removal of the `uses_dual_meter_setup` runtime dependency is what
makes that column's already-confirmed drop (OSS baseline, schema deviation register #17/§7) actually
safe to execute.

---

## Context

### What exists today

`meter_command_batches` (currently named `directive_batches` in the legacy schema; already
confirmed renamed to `meter_command_batches`/`meter_command_batch_executions` as part of the OSS
migration baseline, schema deviation register #16) drives scheduled, grid-wide meter operations.
It has two mutually-exclusive "purpose" columns:

- `task_type: meter_interaction_type_enum` — scan/read operations (`READ_VOLTAGE`, `READ_POWER`, …).
- `fs_command: fs_command_type_enum` (`'ON' | 'OFF'`) — the load-shedding toggle.

`DirectiveBatchService.executeRule` (`apps/tiamat/src/modules/directive-batches/directive-batches.service.ts`)
branches on which column is set:

```ts
if (rule.fs_command) {
  meterInteractionType = isDualMeterGrid
    ? (rule.fs_command === 'ON' ? 'TURN_ON' : 'TURN_OFF')
    : 'SET_POWER_LIMIT';
}
if (rule.task_type) meterInteractionType = rule.task_type;
```

For `SET_POWER_LIMIT`, the target value is derived, not stored: `0` for `ON`, or
`meter.power_limit_hps_mode` (each meter's own configured limit) for `OFF`. Meter targeting is
similarly implicit: `is_manual_mode_on = false` is applied only for `fs_command` batches (not for
scans), and dual-meter grids additionally filter to `meter_type = 'FS'`.

Intent is tracked redundantly at grid level (`grids.should_fs_be_on`, `is_fs_on`) and meter level
(`meters.should_be_on` for relay control, `meters.power_limit_should_be` for throttling) — the
meter-level fields are the durable "intent" columns per ADR-002a's intent/reality model; the
grid-level fields are a cache that only ever made sense for a whole-grid binary toggle.

Two other subsystems key off `fs_command` / the grid-level fields directly: qilin's
`FsControlPredictor`/`FsControlSlider` (a dual-time-slider UI that writes `fs_command` rows), and
`AutopilotService`, which reads `grid.is_fs_on` as forecast input. Neither is touched by this ADR
(see "Out of scope").

### Why this needs to change

The operational concept has outgrown the schema. Load-shedding is no longer just "grid-wide FS
on/off" — it needs to express "set this group of meters to this power limit" for arbitrary groups
and arbitrary values, not just a global binary toggle at `0` or "restore to HPS limit". Continuing
to bolt cases onto `fs_command`/`executeRule`'s conditionals would compound the exact problem this
ADR removes: business logic encoded as runtime branching on implicit facts (`uses_dual_meter_setup`,
which command column happens to be set) instead of explicit, validated configuration.

`grids.uses_dual_meter_setup` is already confirmed **dropped** in the OSS baseline (schema deviation
register #17/§7, "unused in OSS baseline") — but it is not actually unused yet; `executeRule` reads
it today. This ADR is a prerequisite for that drop being safe, not just a documentation
tidy-up.

---

## Decisions

### 1. Merge `fs_command` into `command_type`

`fs_command` is dropped. The surviving column keeps the name `command_type` (renamed from
`task_type` to match the parent table's `meter_command_batches` rename) and is typed as
`meter_interaction_type_enum` directly — the same enum `meter_interactions.meter_interaction_type`
already uses. No new, narrower enum is introduced: any interaction type is technically batchable,
even though the batch-creation UI will offer a curated subset (`TURN_ON`, `TURN_OFF`,
`SET_POWER_LIMIT`, plus the existing read types). This removes the two-column "which field is set"
branching in `executeRule` entirely — the command a batch runs is simply `command_type`, no
translation step.

### 2. Generic `command_payload` for command parameters

A new nullable `command_payload: jsonb` column carries whatever parameter a `command_type` needs,
as a small discriminated union:

```ts
type StaticPayload<T = unknown>  = { mode: 'STATIC';   value: T };
type ResolvedPayload             = { mode: 'RESOLVED'; resolver: string };
type CommandPayload<T = unknown> = StaticPayload<T> | ResolvedPayload;
```

- Parameter-less commands (`TURN_ON`, `TURN_OFF`, `READ_VOLTAGE`, …) → `command_payload IS NULL`.
- A fixed operator-supplied value (e.g. `SET_POWER_LIMIT` to exactly `0`, or to `300`) →
  `{ mode: 'STATIC', value: 300 }`. `value` may be a number, string, or object depending on the
  command.
- A per-meter dynamic value, resolved at execution time (e.g. "restore each meter's own HPS-mode
  limit") → `{ mode: 'RESOLVED', resolver: 'METER_OWN_HPS_LIMIT' }`.

`RESOLVED` payloads are resolved through a small, named, unit-testable **resolver registry** in
backend code — the same "data-driven, named policy" shape ADR-002a already established for
supersession/triage rules:

```ts
const COMMAND_VALUE_RESOLVERS: Record<string, (meter: MeterForCommandExecution) => unknown> = {
  METER_OWN_HPS_LIMIT: meter => meter.power_limit_hps_mode,
};
```

This single mechanism covers today's power-limit case and any future command needing a number,
string, object, or per-meter lookup, without a schema migration per new case. For `SET_POWER_LIMIT`
specifically, the resolved/static value is written into the existing
`meter_interactions.target_power_limit` column at fan-out time (no schema change needed there).

Validation that a `command_payload`'s shape matches what its `command_type` requires (e.g.
`SET_POWER_LIMIT` needs a payload, `TURN_ON` needs none) is a plain in-code TypeScript lookup used
at request-validation time — **not** a database table, and **not** a check on which
`command_type`/`target_meter_type` combinations are "allowed" (see decision 4).

### 3. Explicit `target_meter_type` replaces implicit dual-meter branching

A new nullable `target_meter_type: meter_type_enum` column (`HPS` / `FS`) filters which meters a
batch applies to; `NULL` means all meters, no filter. It applies uniformly to every `command_type`,
not just control commands — e.g. "read voltage on FS meters only" is equally expressible.

This is an explicit, interim mechanism using the enum that already exists on `meters`, standing in
for full group-based targeting (decision 5) until that lands. It is documented here as a stopgap:
once `meter_groups`/group-based targeting exists, `target_meter_type` is superseded by
`target_meter_group_ids` (or equivalent), and this column can be retired.

### 4. No upfront gating of command/target combinations

There is no compatibility check rejecting e.g. `TURN_ON` on a grid without a wired relay, or
`SET_POWER_LIMIT` targeting `HPS` meters. Restricting *which* meters a command applies to is a
legitimate operator decision (there is no reason, for example, an operator shouldn't be able to
hard-cut every meter on a grid for an emergency shutdown) — the previous implicit
"`fs_command` always means `FS`-type meters" behavior was a business default, not a physical
constraint, and baking equivalent defaults back in as *validation* would just relocate the
conditional logic this ADR removes. `target_meter_type` makes the selection explicit instead of
inferring it.

### 5. Full meter-grouping is deferred; the shell is documented, not built

Selecting meters by group (tariff plan, connection type, location, or dimensions not yet known) is
**out of scope for this ADR's implementation**, but the target shape is recorded so that when it
lands, it composes with decisions 1–4 without another schema rework of `meter_command_batches`:

- A first-class `meter_groups` table (id, org/grid scope, name, description) and a many-to-many
  `meter_group_memberships` join table. Groups are named, describable things independent of *why* a
  meter belongs to one.
- `meter_command_batches` targets group(s) by ID (exact column shape TBD at implementation time —
  a join table or an ID array), never raw filter criteria. Execution code never needs to know how a
  meter became a member of a group.

How membership is computed is the open axis, recorded here as a spectrum from cheapest to most
capable — no commitment is made beyond documenting it:

| Level | Mechanism | Notes |
|---|---|---|
| 1 | Flat `meters.tags: text[]`, matched by array overlap | Cheapest; no first-class group entity, rejected as the base design given the desire for named/manageable groups |
| 2 | **Manual membership** — `meter_groups` + `meter_group_memberships`, assigned explicitly (admin action / script) | **Recommended starting point** once this phase begins. Zero automation; membership is exactly whatever was assigned |
| 3 | **Derived membership** — same tables as Level 2, but a sync job (re)computes membership from `connections.tariff_plan`, connection type, pole location, etc. | Population-mechanism upgrade only; execution/query code unchanged from Level 2 |
| 4 | **Rule-based dynamic groups** — `meter_groups.membership_rule: jsonb`, a small filter DSL evaluated live at query time | No sync job, always fresh; requires building and curating a safe filter engine over whitelisted joinable fields |
| 5 | **Composable multi-dimensional segmentation** — groups carry a `dimension` (`TARIFF`, `CONNECTION_TYPE`, `LOCATION`, …); batches combine dimensions with AND/OR/NOT | Full segmentation product; most of this is speculative today |

`meters.meter_type` (`HPS`/`FS`) is expected to eventually be absorbed into this future grouping
system (it currently conflates a hardware/wiring fact with a tariff-adjacent classification), but
this ADR does not change it — it is kept as-is (tariff modeling is undecided) and reused as-is for
`target_meter_type`.

---

## Consequences

### Positive

- Removes the two-column purpose split and the `fs_command`-vs-`task_type` branch in `executeRule`
  entirely; a batch's behavior is fully determined by `command_type` + `command_payload` +
  `target_meter_type`, no derived/inferred state.
- Removes the runtime dependency on `grid.uses_dual_meter_setup`, unblocking its already-confirmed
  baseline drop (register #17/§7).
- `command_payload`'s resolver-registry mechanism generalizes to any future command needing a
  static or per-meter-dynamic value, without further schema migrations.
- `target_meter_type` gives immediate, real targeting flexibility (ALL/HPS/FS) using data that
  already exists, while leaving room for the eventual group system without having to predict its
  shape now.

### Negative / Risks

- `target_meter_type` is an admitted stopgap; it will need a follow-up migration to
  group-based targeting once that lands, including a data migration for any batches created in the
  interim.
- Fully permissive command/target combinations (decision 4) mean a misconfigured batch (e.g.
  `TURN_ON` targeting `ALL` on a grid with no relay-controllable meters) fails silently at
  execution (zero meters matched) rather than at creation time. Accepted as the cost of not
  reintroducing hardcoded capability assumptions; revisit if this proves to be a frequent
  operator error in practice.
- `meter_interaction_type_enum` reuse means `command_type` is not curated at the schema/type level —
  the UI is the only thing preventing nonsensical batch commands (e.g. `TOP_UP`, `JOIN_NETWORK`) from
  being scheduled. Acceptable given `meter_command_batches` already trusted its callers similarly.

### Explicitly out of scope (tracked separately, not blocking this ADR)

- **Grid-level FS intent fields** (`grids.should_fs_be_on`, `is_fs_on`, `should_fs_be_on_updated_at`)
  no longer correspond to a coherent concept once targeting/values are arbitrary. Per ADR-002a's
  intent/reality model, meter-level `should_be_on`/`power_limit_should_be` are the real source of
  truth and the grid-level fields were always a cache. Deprecating them is a separate follow-up
  migration — it has real blast radius (qilin `FsControlPredictor`/`FsControlSlider`,
  `AutopilotService.eval`'s `CURRENT_FS_STATE_INJECTED`, and grid notification toggles
  `is_upcoming_fs_control_rule_notification_enabled` / `is_fs_control_rule_change_notification_enabled`
  all read them today).
- **Data backfill.** Existing `fs_command` rows are not migrated; operators recreate any needed
  scheduled rules manually after cutover.
- **Frontend.** pegasus (`MeterTaskBatcher`, `FsControlView`) and qilin
  (`FsControlPredictor`/`FsControlSlider`) are not updated as part of this ADR. Backend-only.
- **Audit trail.** `audits.from_fs_command` and the hardcoded ON/OFF message wording in
  `DirectiveBatchService.createAudits` need to generalize (structured `command_type`/target fields
  instead of a boolean flag), but this is folded into a separately-planned, more structured audits
  data model rather than solved here.
- **`is_manual_mode_on` scope.** This flag's purpose was largely "exclude a meter from automated FS
  control." With FS control as a distinct concept disappearing, whether/how it should apply across
  all `command_type`s (today it's only enforced for `fs_command` batches, not scans) is an open
  question for the implementation plan, not resolved by this ADR.
- **Schema tracking docs.** `docs/plans/002-oss-migration/002b-schema-*` are maintained by the
  repo maintainer directly and are not updated as part of this ADR.

---

## Triggers (revisit when)

- Group-based targeting (decision 5) is actually scheduled for implementation — resolve the
  membership-mechanism level (starting at Level 2, per the recommendation above) and design the
  exact `meter_command_batches` → group reference shape.
- `target_meter_type` needs a third value or a multi-select — a signal that the group system should
  be pulled forward rather than extending the stopgap further.
- Operators report frequent silent no-op batches from invalid command/target combinations (decision
  4) — revisit whether some minimal capability validation is warranted after all.
- The audits data-model overhaul is scoped — fold in the `from_fs_command` generalization then.

---

## Related

- **ADR-002** — meter state management crossroads (intent vs. reality framing).
- **ADR-002a** — reconciliation controller pattern; source of the named-policy-registry pattern
  reused here for `COMMAND_VALUE_RESOLVERS`.
- **Schema deviation register #16** (`docs/plans/002-oss-migration/002b-schema-deviation-register.md`)
  — the already-confirmed `directive_batches`/`directive_batch_executions` →
  `meter_command_batches`/`meter_command_batch_executions` rename this ADR builds on.
- **Schema deviation register #17/§7** — the already-confirmed `grids.uses_dual_meter_setup` drop
  this ADR's design unblocks.
