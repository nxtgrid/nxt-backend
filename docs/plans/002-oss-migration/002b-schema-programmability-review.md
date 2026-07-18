# Schema Programmability Review (working review)

**Companion to:** `002b-database-baseline.md` — **Task 3c**
**Status:** **Task 3c complete** — H1–H5 signed off (2026-07-09)
**Generated:** 2026-07-09 — full migration chain (`legacy/supabase/migrations/`, 19 files)

## Summary

| kind | count | signed off |
|------|------:|------------|
| enum values (31 types + 1 new) | 180 | **H4 signed off** (4 enum value drops total: #28, #29) |
| functions | 20 + 6 new helpers | **signed off** |
| triggers (19 public + 2 auth + 1 new) | 22 | **signed off** |

Pre-filled renames from register **#10** (router trigger) and **#16** (meter command batch function + triggers).
Default action is **keep** until a batch is signed off; ⚠️ rows need explicit maintainer decision.

## Review batches

| batch | scope | status |
|-------|-------|--------|
| **H1** | RLS helpers — split into H1a / H1b / H1c (below) | **signed off** 2026-07-09 |
| **H2** | Auth + platform RPCs (`handle_*`, `get_grid_status`) | **signed off** 2026-07-09 |
| **H3** | Payments RPCs (`lock_next_order_and_wallets`, `find_*`) | **signed off** 2026-07-09 |
| **H4** | Enum value trim (by capability) | **signed off** 2026-07-09 |
| H5 | Triggers vs functions | **signed off** 2026-07-09 |

## Batch H1 — RLS helpers

H1 is split so difficult functions are reviewed **one at a time**:

| sub-batch | scope | status |
|-----------|-------|--------|
| **H1a** | Quick decisions (lender keep, orphan drop, batch rename) | **signed off** 2026-07-09 |
| **H1b** | `append_rls_*` functions + their INSERT triggers | **signed off** 2026-07-09 — reviewed as **one group discussion** (exception to per-function review); consolidated onto shared helpers |
| **H1c** | `rls_check_if_nxt_member()` | **signed off** 2026-07-09 — rename + redesign |
| H1d | `rls_get_member_org_id()` | provisional keep (not flagged) |

### H1a — Signed off 2026-07-09

| # | function | decision | register |
|---|----------|----------|----------|
| 2 | `rls_check_if_lender()` | **keep** | — |
| 3 | `append_rls_organization_id_by_historical_grid_id()` | **drop** | #21 |
| 4 | `append_rls_organization_id_by_directive_batch_id()` | **rename** → `append_rls_organization_id_by_meter_command_batch_id()` | #16 |

### H1b — `append_rls_*` + triggers — signed off 2026-07-09

**Pattern:** each function is a `BEFORE INSERT` trigger handler that denormalizes `grids.organization_id` (or `accounts.organization_id`) into `NEW.rls_organization_id` on child rows, so org-scoped RLS policies can compare against `rls_get_member_org_id()` without joins at read time. All 10 share this one shape — they differ only in *which* join path reaches `grids`/`accounts` from the inserted row — so they're reviewed together rather than one at a time.

**Gap:** `orders` has `rls_organization_id` but **no** INSERT trigger — the app sets it in tiamat `order-meta.ts`. Not in this group (no `append_rls_*` function wired to it).

**Decision — keep the denormalization strategy, consolidate the join logic (register #23):**

1. **Dead join removed** — `by_account_id()` joined `organizations` without using any of its columns; now a plain single-table `SELECT`.
2. **Second dead lookup removed** — the `organization_id` branch of `by_customer_id_or_agent_id_or_connec()` did `SELECT id FROM organizations WHERE id = NEW.organization_id` just to pass the same value back; now assigns `NEW.organization_id` directly.
3. **`SET search_path TO ''` added to all 10** (9 were missing it; addresses the Supabase "Function Search Path Mutable" linter warning).
4. **Join logic consolidated onto 6 new shared helper functions** — the 10 functions repeat the same multi-hop chains (e.g. `meter → connection → customer → grid → organization` appears near-verbatim in 3 of them). Each helper resolves one entity → `organization_id`, delegating up the hierarchy; each trigger function becomes a thin wrapper.

| Helper (new) | Resolves | Delegates to |
|---|---|---|
| `rls_org_id_from_grid(grid_id)` | `grids.organization_id` | — (leaf) |
| `rls_org_id_from_customer(customer_id)` | `customers.grid_id` → | `rls_org_id_from_grid` |
| `rls_org_id_from_connection(connection_id)` | `connections.customer_id` → | `rls_org_id_from_customer` |
| `rls_org_id_from_agent(agent_id)` | `agents.grid_id` → | `rls_org_id_from_grid` |
| `rls_org_id_from_meter(meter_id)` | `meters.connection_id` → | `rls_org_id_from_connection` |
| `rls_org_id_from_dcu(dcu_id)` | `dcus.grid_id` → | `rls_org_id_from_grid` |

All six: `LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''`. `LANGUAGE sql` + `STABLE` single-`SELECT` functions are inlining-eligible in Postgres — the planner can fold them into the calling query, so delegation costs nothing at runtime versus writing the join inline.

| # | function | trigger(s) ON table | resolves via |
|---|----------|---------------------|-----------|
| 1 | `append_rls_organization_id_by_account_id()` | `…_on_member_insert` ON `members` | `accounts.organization_id` directly (no helper — dead join removed) |
| 2 | `append_rls_organization_id_by_grid_id()` | `…_on_agent_insert` ON `agents`; `…_on_customer_insert` ON `customers`; `…_on_dcus_insert` ON `dcus`; `…_on_directive_batch_insert` ON `directive_batches`¹; `…_on_energy_cabin_insert` ON `energy_cabins`; `…_on_mppt_insert` ON `mppts`; `…_on_pole_insert` ON `poles`; `…_on_route_insert` ON `routers`² | `rls_org_id_from_grid(NEW.grid_id)` |
| 3 | `append_rls_organization_id_by_connection_id()` | `…_on_requested_connection_meters_inser` ON `connection_requested_meters`; `…_on_meter_insert` ON `meters` | `rls_org_id_from_connection(NEW.connection_id)` |
| 4 | `append_rls_organization_id_by_customer_id()` | `…_on_connection_insert` ON `connections`; `…_on_note_insert` ON `notes` | `rls_org_id_from_customer(NEW.customer_id)` |
| 5 | `append_rls_organization_id_by_customer_id_or_agent_id_or_connec()` | `…_on_wallet_insert` ON `wallets` | branches → `rls_org_id_from_customer` / `rls_org_id_from_agent` / `rls_org_id_from_connection` / `NEW.organization_id` direct / `rls_org_id_from_meter` |
| 6 | `append_rls_organization_id_by_dcu_id_or_meter_id()` | `…_on_meter_install_session_insert` ON `metering_hardware_install_sessions` | branches → `rls_org_id_from_dcu` / `rls_org_id_from_meter` |
| 7 | `append_rls_organization_id_by_directive_batch_id()`¹ | `…_on_directive_batch_execution_insert` ON `directive_batch_executions` | `rls_org_id_from_grid(grid_id)` looked up from batch row |
| 8 | `append_rls_organization_id_by_meter_id()` | `…_on_issue_insert` ON `issues` | `rls_org_id_from_meter(NEW.meter_id)` |
| 9 | `append_rls_organization_id_by_metering_hardware_install_session()` | `…_on_meter_commissioning_insert` ON `meter_commissionings` | `rls_org_id_from_meter(meter_id)` looked up from session row |
| 10 | `append_rls_organization_id_by_order_id()` | `…_on_transaction_insert` ON `transactions` | `rls_org_id_from_grid(historical_grid_id)` looked up from order row |

¹ Register #16 table/column/function/trigger renames apply at Task 5 (function #7, trigger on row #2 and #7).  
² Register #10 trigger rename `…_on_route_insert` → `…_on_router_insert` (row #2).

**Related finding (out of this group, fixed alongside it):** `accounts` has two RLS policies (`Allow org member to select`, `Allow org members to update`) filtering directly on `organization_id`, but — unlike every other table with an RLS-filtered org column — there's no supporting index. Adding `idx_accounts_organization_id` (register #25).

**Volatility:** the 6 new helpers are marked `STABLE` (see above). The 10 trigger functions themselves stay unmarked/`VOLATILE` — they run once per row on `BEFORE INSERT`, so volatility marking doesn't apply the same way it did for `rls_check_if_admin_org_member()` (an RLS-policy expression evaluated per-statement). No further volatility decision needed here; general volatility audit for the *rest* of the schema's functions stays in **Task 3d**.

**Index coverage — checked, no gap found:** traced the join chain for all 10 functions; every hop resolves via a primary-key lookup (walk from a known child row up through FK values to parent PKs), which is always indexed automatically. No additional indexes needed for these functions' own joins.

### H1c — `rls_check_if_nxt_member()` — signed off 2026-07-09

**Decision:** rename + redesign, not a plain rename. The admin-organization concept becomes **DB-native**
instead of the hard-coded literal `2` — see **ADR-007 Amendment (2026-07-09)** for the full
architecture (this was a genuine cross-cutting decision, not just a Task 3c row action).

| Aspect | Before | After |
|--------|--------|-------|
| Function name | `rls_check_if_nxt_member()` | `rls_check_if_admin_org_member()` |
| Org identification | Hard-coded `nxt_org_id int := 2` | Reads `current_setting('app.admin_organization_id', true)`, populated from `organizations.organization_type = 'PLATFORM_OPERATOR'` via a trigger-maintained GUC |
| Volatility | (unmarked → `VOLATILE`) | Marked **`STABLE`** — evaluated once per statement, not once per row |
| New schema objects | — | `organization_type_enum` value `PLATFORM_OPERATOR`; partial unique index `one_platform_operator_org`; sync trigger on `organizations` |

**Why not a live `organizations` lookup:** would require an index/heap fetch + MVCC check per
evaluation — categorically slower than a GUC's in-memory read, even with `STABLE`. The GUC is
trigger-maintained so it's always consistent with the DB-native flag without paying that cost at
RLS-check time.

**Setup flow (no manual script needed for the common path):** create the platform-operator
organization, set `organization_type = 'PLATFORM_OPERATOR'` — the trigger records its id into the GUC
automatically.

**Open items carried to ADR-007** (not blocking Task 3c, but tracked there): how backend `getConfig()`
consumers and frontend apps resolve this now-DB-native value.

### H1 function register

| function | action | register § | rationale | notes |
|----------|--------|------------|-----------|-------|
| `rls_check_if_nxt_member()` | **rename + redesign** | **#22** | H1c signed off 2026-07-09 | → `rls_check_if_admin_org_member()`; reads GUC instead of hard-coded `2`; marked `STABLE`. See ADR-007 Amendment (2026-07-09) |
| `rls_check_if_lender()` | keep |  | H1a signed off 2026-07-09 | JWT organization_type = LENDER; 4 lender SELECT policies |
| `rls_get_member_org_id()` | keep |  | provisional | JWT organization_id; primary org-scoped RLS helper |
| `append_rls_organization_id_by_account_id()` | **keep + redesign** | **#23** | H1b signed off 2026-07-09 | dead join removed; body now direct `SELECT` (no helper needed) |
| `append_rls_organization_id_by_grid_id()` | **keep + redesign** | **#23** | H1b signed off 2026-07-09 | delegates to new helper `rls_org_id_from_grid()` |
| `append_rls_organization_id_by_historical_grid_id()` | **drop** | **#21** | H1a signed off 2026-07-09 | Orphan — no trigger; dead code |
| `append_rls_organization_id_by_connection_id()` | **keep + redesign** | **#23** | H1b signed off 2026-07-09 | delegates to new helper `rls_org_id_from_connection()` |
| `append_rls_organization_id_by_customer_id()` | **keep + redesign** | **#23** | H1b signed off 2026-07-09 | delegates to new helper `rls_org_id_from_customer()` |
| `append_rls_organization_id_by_customer_id_or_agent_id_or_connec()` | **keep + redesign** | **#23** | H1b signed off 2026-07-09 | branches delegate to helpers; 2nd dead lookup (`organization_id` branch) removed |
| `append_rls_organization_id_by_dcu_id_or_meter_id()` | **keep + redesign** | **#23** | H1b signed off 2026-07-09 | branches delegate to `rls_org_id_from_dcu()` / `rls_org_id_from_meter()` |
| `append_rls_organization_id_by_directive_batch_id()` | **rename + redesign** | **#16, #23** | H1a + H1b signed off 2026-07-09 | → `append_rls_organization_id_by_meter_command_batch_id()`; delegates to `rls_org_id_from_grid()` |
| `append_rls_organization_id_by_meter_id()` | **keep + redesign** | **#23** | H1b signed off 2026-07-09 | delegates to new helper `rls_org_id_from_meter()` |
| `append_rls_organization_id_by_metering_hardware_install_session()` | **keep + redesign** | **#23** | H1b signed off 2026-07-09 | delegates to `rls_org_id_from_meter()` via session's `meter_id` |
| `append_rls_organization_id_by_order_id()` | **keep + redesign** | **#23** | H1b signed off 2026-07-09 | delegates to `rls_org_id_from_grid()` via `historical_grid_id` |
| `rls_org_id_from_grid(grid_id)` | **add (new)** | **#23** | H1b signed off 2026-07-09 | `LANGUAGE sql STABLE`; leaf helper — `grids.organization_id` |
| `rls_org_id_from_customer(customer_id)` | **add (new)** | **#23** | H1b signed off 2026-07-09 | `LANGUAGE sql STABLE`; delegates to `rls_org_id_from_grid()` |
| `rls_org_id_from_connection(connection_id)` | **add (new)** | **#23** | H1b signed off 2026-07-09 | `LANGUAGE sql STABLE`; delegates to `rls_org_id_from_customer()` |
| `rls_org_id_from_agent(agent_id)` | **add (new)** | **#23** | H1b signed off 2026-07-09 | `LANGUAGE sql STABLE`; delegates to `rls_org_id_from_grid()` |
| `rls_org_id_from_meter(meter_id)` | **add (new)** | **#23** | H1b signed off 2026-07-09 | `LANGUAGE sql STABLE`; delegates to `rls_org_id_from_connection()` |
| `rls_org_id_from_dcu(dcu_id)` | **add (new)** | **#23** | H1b signed off 2026-07-09 | `LANGUAGE sql STABLE`; delegates to `rls_org_id_from_grid()` |

---

## Batch H2 — Auth + platform RPCs — signed off 2026-07-09

Reviewed one function at a time (same workflow as H1c).

| # | function | decision | register |
|---|----------|----------|----------|
| 1 | `handle_new_user()` | **keep** | — |
| 2 | `handle_update_user()` | **keep** | — |
| 3 | `get_grid_status(grid_id)` | **keep + redesign** | **#26** |

### H2 #1 — `handle_new_user()` — signed off 2026-07-09

`AFTER INSERT` on `auth.users` → creates bare `public.accounts` row (`supabase_id`, `email`, `phone`, `full_name`, `telegram_link_token`). `organization_id` intentionally deferred to `handle_update_user()` (backend always follows with `updateUserById({ app_metadata })`). Already `SECURITY DEFINER` + `SET search_path TO ''`. No changes.

### H2 #2 — `handle_update_user()` — signed off 2026-07-09

`AFTER UPDATE` on `auth.users` → syncs `email`, `phone`, `full_name`, `organization_id` (from `raw_app_meta_data`) to `accounts`. `organization_id` denormalization required for org-scoped RLS policies on `accounts` (`Allow org member to select/update`). `account_type` / `member_type` / `grid_id` stay JWT-only (RLS helpers read from `auth.jwt()`). Already hardened. No changes.

### H2 #3 — `get_grid_status(grid_id)` — signed off 2026-07-09

RPC for pegasus grid dashboard (`GridDashboardView.vue`). **Redesign** to align with register **#17** column drops:

| Column | Action |
|--------|--------|
| `is_hps_on`, `is_fs_on`, `is_cabin_meter_credit_depleting`, `customer_count` | **keep** in return type |
| `are_all_dcus_online`, `are_all_dcus_under_high_load_threshold` | **drop** from return type — columns dropped from `grids` (register #17); pegasus already fetches gateway status via separate `dcus` query; UI usage of RPC columns commented out |

Also marked **`STABLE`** (read-only RPC). Not `SECURITY DEFINER` — runs as caller; RLS on joined tables scopes `customer_count` correctly.

**Cutover / code impact:** pegasus supabase types + `GridDashboardView` at production-monitoring import (no live UI reads the dropped columns).

---

## Batch H4 — Enum value trim

Sub-batches by capability (mirrors Task 3a/3b). Default action is **keep** unless signed off otherwise.

### H4a — Platform core — signed off 2026-07-09

| enum | decision | register |
|------|----------|----------|
| `account_type_enum` (3 values) | **keep all** | — |
| `organization_type_enum` (4 values incl. `PLATFORM_OPERATOR`) | **keep all** | #22 (`PLATFORM_OPERATOR` add) |
| `weather_type_enum` (6 values) | **keep all** | — |
| `member_type_enum` (10 values) | **keep all** | — |
| `external_system_enum` | **keep 11, drop 3** | **#28** |

**`member_type_enum` — keep all 10:** RBAC vocabulary on `members` + JWT `app_metadata`; frontend assigns a subset but DB/validation accepts full set. Trimming = product decision + painful Postgres enum surgery if rows exist.

**`external_system_enum` — drop `JOTFORM`, `STEAMACO`, `ACREL`; keep rest (incl. `JIRA`):**

| Value | Decision | Rationale |
|-------|----------|-----------|
| CALIN, VICTRON, FLUTTERWAVE, AFRICASTALKING, TELEGRAM, ZEROTIER, SENDGRID, EPICOLLECT, MAKE, FLOW_XO, SOLCAST, **JIRA** | keep | Live OSS integrations; **JIRA** required — `issues.external_tracking_system` (renamed from `external_system`, register #20) is typed `external_system_enum` with DB default `'JIRA'` |
| JOTFORM | **drop** | pd-hero dropped (#14); no code refs |
| STEAMACO | **drop** | No live code refs (legacy FDW only) |
| ACREL | **drop** | No code refs |

### H4b — Metering — signed off 2026-07-09

**Decision: keep all — no drops.**

| enum | values | decision |
|------|--------|----------|
| `communication_protocol_enum` | CALIN_V1, CALIN_V2, CALIN_LORAWAN | **keep all** — live CALIN integration paths |
| `gender_enum` | MALE, FEMALE | **keep all** — `customers`, DTO validation |
| `generator_type_enum` | SMALL, LARGE | **keep all** — `customers.generator_owned` |
| `id_document_type_enum` | PASSPORT, NATIONAL_ID, DRIVING_LICENSE, VOTERS_CARD | **keep all** — `connections.document_type`, Epicollect import |
| `meter_commissioning_status_enum`, `meter_interaction_*`, `meter_phase_enum`, `meter_type_enum`, `mhi_*`, `fs_command_type_enum` | all | **keep all** — core metering vocabulary |

### H4c — Payments — signed off 2026-07-09

**Decision: keep all — no drops.** All payment enums (`currency_enum`, `order_*`, `payment_*`, `transaction_status_enum`, `wallet_type_enum`) — ~35 values; no trim flags from Task 3a.

### H4d — Notifications — signed off 2026-07-09

**Decision: keep 15, drop 1.**

| Value | Decision | Rationale |
|-------|----------|-----------|
| All except below | **keep** | Active notification paths (sendgrid, tiamat orders, loch revenue) or retained for historical `notifications` rows / external automation |
| `AUTO_PAYOUT_GENRATION_REPORT` | **drop** | **#29** — payouts module dropped (register #13); only producer was dropped `payouts.service` |

### H4e — Field ops + production monitoring — signed off 2026-07-09

**Decision: keep all — no drops.** `issue_status_enum`, `issue_type_enum` (22 values), `mppt_type_enum`, `solcast_cache_request_type_enum`.

---

## Batch H3 — Payments RPCs — signed off 2026-07-09

Reviewed one function at a time (same workflow as H2).

| # | function | decision | register |
|---|----------|----------|----------|
| 1 | `lock_next_order_and_wallets(uuid)` | **keep** | **#24** (search_path only) |
| 2 | `find_energy_topup_revenue(...)` | **keep + STABLE** | **#27** |
| 3 | `find_top_spenders(...)` | **keep + STABLE + GROUP BY fix** | **#27** |

### H3 #1 — `lock_next_order_and_wallets(uuid)` — signed off 2026-07-09

Atomic pessimistic lock for tiamat payment loop: oldest `PENDING` order with both wallets unlocked → `FOR UPDATE SKIP LOCKED` on order + sender/receiver wallets → sets `lock_session`, returns wallet IDs. Supersedes dropped `lock_next_order()` (register #13). Logic confirmed sound; correctly stays **`VOLATILE`**. `SET search_path TO ''` already recorded (#24).

### H3 #2 — `find_energy_topup_revenue(grid_id, start_date, end_date)` — signed off 2026-07-09

Read-only revenue aggregate on completed `ENERGY_TOPUP` orders by `historical_grid_id`. Used by loch/yeti via `SpendingService`. Already has `SET search_path TO ''`. Mark **`STABLE`**. No body change.

### H3 #3 — `find_top_spenders(...)` — signed off 2026-07-09

Read-only top-N energy-topup spenders for loch revenue reports. Already has `SET search_path TO ''`. Mark **`STABLE`**. **GROUP BY fix:** legacy grouped by `meta_receiver_id` (meter) + customer fields, splitting one customer across multiple meters into separate rows; init migration uses `GROUP BY meta_receiver_id_part_2, meta_receiver_name_part_2` only (customer-level aggregation). Return columns unchanged (`full_name`, `id`, `amount`).

---

## Register — enum values (H4)

| enum | value | capability | action | register § | rationale | notes |
|------|-------|------------|--------|------------|-----------|-------|
| account_type_enum | AGENT | Platform core | keep |  |  |  |
| account_type_enum | MEMBER | Platform core | keep |  |  |  |
| account_type_enum | CUSTOMER | Platform core | keep |  |  |  |
| member_type_enum | SUPERADMIN | Platform core | keep |  | H4a 2026-07-09 | RBAC vocabulary — keep all 10 |
| member_type_enum | ADMIN | Platform core | keep |  | H4a 2026-07-09 | RBAC vocabulary — keep all 10 |
| member_type_enum | PARTNER | Platform core | keep |  | H4a 2026-07-09 | RBAC vocabulary — keep all 10 |
| member_type_enum | FINANCE | Platform core | keep |  | H4a 2026-07-09 | RBAC vocabulary — keep all 10 |
| member_type_enum | DEVELOPER | Platform core | keep |  | H4a 2026-07-09 | RBAC vocabulary — keep all 10 |
| member_type_enum | MANAGER | Platform core | keep |  | H4a 2026-07-09 | RBAC vocabulary — keep all 10 |
| member_type_enum | SUPPORT | Platform core | keep |  | H4a 2026-07-09 | RBAC vocabulary — keep all 10 |
| member_type_enum | SERVICE | Platform core | keep |  | H4a 2026-07-09 | RBAC vocabulary — keep all 10 |
| member_type_enum | SALES | Platform core | keep |  | H4a 2026-07-09 | RBAC vocabulary — keep all 10 |
| member_type_enum | TECH | Platform core | keep |  | H4a 2026-07-09 | RBAC vocabulary — keep all 10 |
| organization_type_enum | SOLAR_DEVELOPER | Platform core | keep |  |  |  |
| organization_type_enum | LENDER | Platform core | keep |  |  |  |
| organization_type_enum | DATA_AGGREGATOR | Platform core | keep |  |  |  |
| organization_type_enum | PLATFORM_OPERATOR | Platform core | **add** | **#22** | H1c signed off 2026-07-09 | New value, not in legacy chain — ADR-007 Amendment (2026-07-09); enables DB-native admin-org RLS |
| external_system_enum | STEAMACO | Platform core | **drop** | **#28** | H4a 2026-07-09 | No live code refs |
| external_system_enum | CALIN | Platform core | keep |  | H4a 2026-07-09 | Metering/device integration |
| external_system_enum | SOLCAST | Platform core | keep |  | H4a 2026-07-09 | Production forecasting |
| external_system_enum | VICTRON | Platform core | keep |  | H4a 2026-07-09 | Production monitoring |
| external_system_enum | FLUTTERWAVE | Platform core | keep |  | H4a 2026-07-09 | Payments adapter |
| external_system_enum | AFRICASTALKING | Platform core | keep |  | H4a 2026-07-09 | SMS/USSD notifications |
| external_system_enum | JOTFORM | Platform core | **drop** | **#28** | H4a 2026-07-09 | pd-hero dropped (#14); no code refs |
| external_system_enum | EPICOLLECT | Platform core | keep |  | H4a 2026-07-09 | Field ops site pipeline |
| external_system_enum | JIRA | Platform core | keep |  | H4a 2026-07-09 | `issues.external_tracking_system` default + Jira integration |
| external_system_enum | TELEGRAM | Platform core | keep |  | H4a 2026-07-09 | Notification connector |
| external_system_enum | ZEROTIER | Platform core | keep |  | H4a 2026-07-09 | Router monitoring |
| external_system_enum | MAKE | Platform core | keep |  | H4a 2026-07-09 | Tier-3 integration (parameterized) |
| external_system_enum | FLOW_XO | Platform core | keep |  | H4a 2026-07-09 | Tier-3 integration (parameterized) |
| external_system_enum | SENDGRID | Platform core | keep |  | H4a 2026-07-09 | Email notifications |
| external_system_enum | ACREL | Platform core | **drop** | **#28** | H4a 2026-07-09 | No code refs |
| weather_type_enum | CLOUDY | Platform core | keep |  |  |  |
| weather_type_enum | CLOUDS | Platform core | keep |  |  |  |
| weather_type_enum | SHOWERS | Platform core | keep |  |  |  |
| weather_type_enum | SUNNY | Platform core | keep |  |  |  |
| weather_type_enum | UNKNOWN | Platform core | keep |  |  |  |
| weather_type_enum | CLOUDY_WITH_RAIN | Platform core | keep |  |  |  |
| communication_protocol_enum | CALIN_V1 | (2) Metering | keep |  | H4b 2026-07-09 | CALIN API v1 path |
| communication_protocol_enum | CALIN_V2 | (2) Metering | keep |  | H4b 2026-07-09 | CALIN API v2 path |
| communication_protocol_enum | CALIN_LORAWAN | (2) Metering | keep |  | H4b 2026-07-09 | LoRaWAN path |
| fs_command_type_enum | ON | (2) Metering | keep |  | H4b 2026-07-09 |  |
| fs_command_type_enum | OFF | (2) Metering | keep |  | H4b 2026-07-09 |  |
| gender_enum | MALE | (2) Metering | keep |  | H4b 2026-07-09 |  |
| gender_enum | FEMALE | (2) Metering | keep |  | H4b 2026-07-09 |  |
| generator_type_enum | SMALL | (2) Metering | keep |  | H4b 2026-07-09 |  |
| generator_type_enum | LARGE | (2) Metering | keep |  | H4b 2026-07-09 |  |
| id_document_type_enum | PASSPORT | (2) Metering | keep |  | H4b 2026-07-09 |  |
| id_document_type_enum | NATIONAL_ID | (2) Metering | keep |  | H4b 2026-07-09 |  |
| id_document_type_enum | DRIVING_LICENSE | (2) Metering | keep |  | H4b 2026-07-09 |  |
| id_document_type_enum | VOTERS_CARD | (2) Metering | keep |  | H4b 2026-07-09 |  |
| meter_commissioning_status_enum | PENDING | (2) Metering | keep |  |  |  |
| meter_commissioning_status_enum | PROCESSING | (2) Metering | keep |  |  |  |
| meter_commissioning_status_enum | SUCCESSFUL | (2) Metering | keep |  |  |  |
| meter_commissioning_status_enum | FAILED | (2) Metering | keep |  |  |  |
| meter_interaction_status_enum | QUEUED | (2) Metering | keep |  |  | chain adds DEFERRED, SUSPENDED (20251111, 20260226) |
| meter_interaction_status_enum | ABORTED | (2) Metering | keep |  |  | chain adds DEFERRED, SUSPENDED (20251111, 20260226) |
| meter_interaction_status_enum | PROCESSING | (2) Metering | keep |  |  | chain adds DEFERRED, SUSPENDED (20251111, 20260226) |
| meter_interaction_status_enum | SUCCESSFUL | (2) Metering | keep |  |  | chain adds DEFERRED, SUSPENDED (20251111, 20260226) |
| meter_interaction_status_enum | FAILED | (2) Metering | keep |  |  | chain adds DEFERRED, SUSPENDED (20251111, 20260226) |
| meter_interaction_status_enum | DEFERRED | (2) Metering | keep |  |  | chain adds DEFERRED, SUSPENDED (20251111, 20260226) |
| meter_interaction_status_enum | SUSPENDED | (2) Metering | keep |  |  | chain adds DEFERRED, SUSPENDED (20251111, 20260226) |
| meter_interaction_type_enum | READ_CREDIT | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | READ_POWER_LIMIT | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | READ_VOLTAGE | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | SET_POWER_LIMIT | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | TOP_UP | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | TURN_ON | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | TURN_OFF | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | READ_POWER | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | READ_CURRENT | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | CLEAR_CREDIT | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | CLEAR_TAMPER | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | READ_REPORT | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | JOIN_NETWORK | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | DELIVER_PREEXISTING_TOKEN | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | READ_VERSION | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | READ_DATE | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | SET_DATE | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | READ_TIME | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_interaction_type_enum | SET_TIME | (2) Metering | keep |  |  | chain grows to 19 values (20251110 → 20260428) |
| meter_phase_enum | SINGLE_PHASE | (2) Metering | keep |  |  |  |
| meter_phase_enum | THREE_PHASE | (2) Metering | keep |  |  |  |
| meter_type_enum | HPS | (2) Metering | keep |  |  |  |
| meter_type_enum | FS | (2) Metering | keep |  |  |  |
| mhi_operation_enum | ADD | (2) Metering | keep |  |  |  |
| mhi_operation_enum | REMOVE | (2) Metering | keep |  |  |  |
| mhi_status_enum | PENDING | (2) Metering | keep |  |  |  |
| mhi_status_enum | PROCESSING | (2) Metering | keep |  |  |  |
| mhi_status_enum | SUCCESSFUL | (2) Metering | keep |  |  |  |
| mhi_status_enum | FAILED | (2) Metering | keep |  |  |  |
| currency_enum | USD | (3) Payments | keep |  |  |  |
| currency_enum | NGN | (3) Payments | keep |  |  |  |
| currency_enum | EUR | (3) Payments | keep |  |  |  |
| order_actor_type_enum | BANKING_SYSTEM | (3) Payments | keep |  |  |  |
| order_actor_type_enum | ORGANIZATION | (3) Payments | keep |  |  |  |
| order_actor_type_enum | CONNECTION | (3) Payments | keep |  |  |  |
| order_actor_type_enum | METER | (3) Payments | keep |  |  |  |
| order_actor_type_enum | AGENT | (3) Payments | keep |  |  |  |
| order_actor_type_enum | CUSTOMER | (3) Payments | keep |  |  |  |
| order_status_enum | INITIALISED | (3) Payments | keep |  |  |  |
| order_status_enum | PENDING | (3) Payments | keep |  |  |  |
| order_status_enum | COMPLETED | (3) Payments | keep |  |  |  |
| order_status_enum | FAILED | (3) Payments | keep |  |  |  |
| order_status_enum | CANCELLED | (3) Payments | keep |  |  |  |
| order_status_enum | TIMED_OUT | (3) Payments | keep |  |  |  |
| order_status_enum | IGNORED | (3) Payments | keep |  |  |  |
| order_type_enum | ENERGY_TOPUP | (3) Payments | keep |  |  |  |
| order_type_enum | CONNECTION_PAYMENT | (3) Payments | keep |  |  |  |
| order_type_enum | CONNECTION_REFUND | (3) Payments | keep |  |  |  |
| order_type_enum | AGENT_WITHDRAWAL | (3) Payments | keep |  |  |  |
| order_type_enum | AGENT_TOPUP | (3) Payments | keep |  |  |  |
| order_type_enum | ORGANIZATION_TOPUP | (3) Payments | keep |  |  |  |
| order_type_enum | ORGANIZATION_WITHDRAWAL | (3) Payments | keep |  |  |  |
| order_type_enum | CUSTOMER_TOPUP | (3) Payments | keep |  |  |  |
| payment_channel_enum | USSD | (3) Payments | keep |  |  |  |
| payment_channel_enum | AYRTON | (3) Payments | keep |  |  |  |
| payment_channel_enum | NIFFLER | (3) Payments | keep |  |  |  |
| payment_channel_enum | TELEGRAM | (3) Payments | keep |  |  |  |
| payment_method_enum | CREDIT_CARD | (3) Payments | keep |  |  |  |
| payment_method_enum | USSD | (3) Payments | keep |  |  |  |
| payment_method_enum | BANK_TRANSFER | (3) Payments | keep |  |  |  |
| transaction_status_enum | SUCCESSFUL | (3) Payments | keep |  |  |  |
| transaction_status_enum | FAILED | (3) Payments | keep |  |  |  |
| wallet_type_enum | VIRTUAL | (3) Payments | keep |  |  |  |
| wallet_type_enum | REAL | (3) Payments | keep |  |  |  |
| notification_status_enum | PENDING | (4) Notifications | keep |  |  |  |
| notification_status_enum | PROCESSING | (4) Notifications | keep |  |  |  |
| notification_status_enum | RECEIVED_BY_API | (4) Notifications | keep |  |  |  |
| notification_status_enum | FAILED | (4) Notifications | keep |  |  |  |
| notification_status_enum | SUCCESSFUL | (4) Notifications | keep |  |  |  |
| notification_status_enum | READ | (4) Notifications | keep |  |  |  |
| notification_status_enum | UNKNOWN | (4) Notifications | keep |  |  |  |
| notification_type_enum | GRID_IS_HPS_ON_STATE_CHANGE | (4) Notifications | keep |  | H4d 2026-07-09 |  |
| notification_type_enum | GRID_IS_FS_ON_STATE_CHANGE | (4) Notifications | keep |  | H4d 2026-07-09 |  |
| notification_type_enum | GRID_METERING_HARDWARE_STATE_CHANGE | (4) Notifications | keep |  | H4d 2026-07-09 |  |
| notification_type_enum | FS_RULE_EXECUTION_COMING_UP | (4) Notifications | keep |  | H4d 2026-07-09 |  |
| notification_type_enum | FS_RULE_CHANGED | (4) Notifications | keep |  | H4d 2026-07-09 |  |
| notification_type_enum | TARIFF_RULE_CHANGED | (4) Notifications | keep |  | H4d 2026-07-09 |  |
| notification_type_enum | CLEAN_PANELS_REMINDER | (4) Notifications | keep |  | H4d 2026-07-09 |  |
| notification_type_enum | GRID_REVENUE | (4) Notifications | keep |  | H4d 2026-07-09 | loch revenue-update |
| notification_type_enum | PASSWORD_RESET | (4) Notifications | keep |  | H4d 2026-07-09 | sendgrid |
| notification_type_enum | INVITE | (4) Notifications | keep |  | H4d 2026-07-09 | sendgrid |
| notification_type_enum | AUTO_PAYOUT_GENRATION_REPORT | (4) Notifications | **drop** | **#29** | H4d 2026-07-09 | payouts module dropped (#13) |
| notification_type_enum | CREDIT_SENT | (4) Notifications | keep |  | H4d 2026-07-09 |  |
| notification_type_enum | CREDIT_RECEIVED | (4) Notifications | keep |  | H4d 2026-07-09 | tiamat USSD/orders |
| notification_type_enum | METER_TOPPED_UP | (4) Notifications | keep |  | H4d 2026-07-09 | tiamat orders SMS |
| notification_type_enum | PAYMENT_REJECTED | (4) Notifications | keep |  | H4d 2026-07-09 | tiamat orders |
| notification_type_enum | SITE_SUBMISSION | (4) Notifications | keep |  | H4d 2026-07-09 | sendgrid, tiamat |
| issue_status_enum | OPEN | (5) Field ops | keep |  |  |  |
| issue_status_enum | CLOSED | (5) Field ops | keep |  |  |  |
| issue_status_enum | OVERRIDDEN | (5) Field ops | keep |  |  |  |
| issue_type_enum | NO_COMMUNICATION | (5) Field ops | keep |  |  |  |
| issue_type_enum | METER_NOT_ACTIVATED | (5) Field ops | keep |  |  |  |
| issue_type_enum | TAMPER | (5) Field ops | keep |  |  |  |
| issue_type_enum | POWER_LIMIT_BREACHED | (5) Field ops | keep |  |  |  |
| issue_type_enum | OVER_VOLTAGE | (5) Field ops | keep |  |  |  |
| issue_type_enum | LOW_VOLTAGE | (5) Field ops | keep |  |  |  |
| issue_type_enum | POWER_LIMIT_BAD_CONFIGURATION | (5) Field ops | keep |  |  |  |
| issue_type_enum | METER_STATE_BAD_CONFIGURATION | (5) Field ops | keep |  |  |  |
| issue_type_enum | UNEXPECTED_POWER_LIMIT | (5) Field ops | keep |  |  |  |
| issue_type_enum | UNEXPECTED_METER_STATUS | (5) Field ops | keep |  |  |  |
| issue_type_enum | NO_CREDIT | (5) Field ops | keep |  |  |  |
| issue_type_enum | NO_CONSUMPTION | (5) Field ops | keep |  |  |  |
| issue_type_enum | NUMBER_OF_PHASES | (5) Field ops | keep |  |  |  |
| issue_type_enum | VEBUS_STATE | (5) Field ops | keep |  |  |  |
| issue_type_enum | VEBUS_ERROR | (5) Field ops | keep |  |  |  |
| issue_type_enum | QUATTRO_TEMPERATURE_ALARM | (5) Field ops | keep |  |  |  |
| issue_type_enum | QUATTRO_OVERLOAD_ALARM | (5) Field ops | keep |  |  |  |
| issue_type_enum | HIGH_BATTERY_TEMPERATURE_ALARM | (5) Field ops | keep |  |  |  |
| issue_type_enum | CELL_IMBALANCE_ALARM | (5) Field ops | keep |  |  |  |
| issue_type_enum | HIGH_CHARGE_CURRENT_ALARM | (5) Field ops | keep |  |  |  |
| issue_type_enum | HIGH_CHARGE_TEMPERATURE_ALARM | (5) Field ops | keep |  |  |  |
| issue_type_enum | BATTERY_INTERNAL_FAILURE | (5) Field ops | keep |  |  |  |
| issue_type_enum | BATTERY_CHARGE_BLOCKED_ALARM | (5) Field ops | keep |  |  |  |
| issue_type_enum | BATTERY_DISCHARGE_BLOCKED_ALARM | (5) Field ops | keep |  |  |  |
| mppt_type_enum | MPPT | (1) Production monitoring | keep |  |  |  |
| mppt_type_enum | PV_INVERTER | (1) Production monitoring | keep |  |  |  |
| solcast_cache_request_type_enum | ESTIMATED_ACTUALS | (1) Production monitoring | keep |  |  |  |
| solcast_cache_request_type_enum | FORECAST | (1) Production monitoring | keep |  |  |  |

## Batch H5 — Triggers vs functions

H5 confirms trigger wiring matches signed-off function decisions (H1–H3). **No new logic review** — H1b already reviewed the `append_rls_*` group together with their triggers; H5 is the formal trigger register pass before Task 5.

**Out of scope (Task 3a, not in H5 register):** triggers on excluded/dropped objects — `directives`, `lorawan_directives`, `devices`/`device_logs`, `meter_credit_transfers`; Make.com grid webhooks (register #6, parameterized).

**Known gap (app, not trigger):** `orders.rls_organization_id` has no INSERT trigger — set in tiamat `order-meta.ts` (documented in H1b).

| sub-batch | scope | count | status |
|-----------|-------|------:|--------|
| **H5a** | `append_rls_*` INSERT triggers (legacy chain) | 19 | **signed off** 2026-07-09 |
| **H5b** | Auth triggers on `auth.users` | 2 | **signed off** 2026-07-09 |
| **H5c** | New admin-org GUC sync trigger (#22, not in legacy chain) | 1 | **signed off** 2026-07-09 |

### H5a — `append_rls_*` INSERT triggers — signed off 2026-07-09

All are `BEFORE INSERT FOR EACH ROW`. **Keep all 19** — wiring matches H1b function register; bodies pick up #23 redesign at Task 5 without trigger DDL changes (except renames below).

| # | trigger (legacy name) | ON table | function | action | register |
|---|------------------------|----------|----------|--------|----------|
| 1 | `append_rls_organization_id_on_member_insert` | `members` | `append_rls_organization_id_by_account_id()` | keep | — |
| 2 | `append_rls_organization_id_on_agent_insert` | `agents` | `append_rls_organization_id_by_grid_id()` | keep | — |
| 3 | `append_rls_organization_id_on_customer_insert` | `customers` | `append_rls_organization_id_by_grid_id()` | keep | — |
| 4 | `append_rls_organization_id_on_dcus_insert` | `dcus` | `append_rls_organization_id_by_grid_id()` | keep | — |
| 5 | `append_rls_organization_id_on_directive_batch_insert` | `directive_batches` | `append_rls_organization_id_by_grid_id()` | **rename** | **#16** → `…_on_meter_command_batch_insert` ON `meter_command_batches` |
| 6 | `append_rls_organization_id_on_energy_cabin_insert` | `energy_cabins` | `append_rls_organization_id_by_grid_id()` | keep | — |
| 7 | `append_rls_organization_id_on_mppt_insert` | `mppts` | `append_rls_organization_id_by_grid_id()` | keep | — |
| 8 | `append_rls_organization_id_on_pole_insert` | `poles` | `append_rls_organization_id_by_grid_id()` | keep | — |
| 9 | `append_rls_organization_id_on_route_insert` | `routers` | `append_rls_organization_id_by_grid_id()` | **rename** | **#10** → `…_on_router_insert` |
| 10 | `append_rls_organization_id_on_requested_connection_meters_inser` | `connection_requested_meters` | `append_rls_organization_id_by_connection_id()` | keep | legacy name truncated at 63 chars |
| 11 | `append_rls_organization_id_on_connection_insert` | `connections` | `append_rls_organization_id_by_customer_id()` | keep | — |
| 12 | `append_rls_organization_id_on_meter_insert` | `meters` | `append_rls_organization_id_by_connection_id()` | keep | — |
| 13 | `append_rls_organization_id_on_note_insert` | `notes` | `append_rls_organization_id_by_customer_id()` | keep | — |
| 14 | `append_rls_organization_id_on_wallet_insert` | `wallets` | `append_rls_organization_id_by_customer_id_or_agent_id_or_connec()` | keep | — |
| 15 | `append_rls_organization_id_on_meter_install_session_insert` | `metering_hardware_install_sessions` | `append_rls_organization_id_by_dcu_id_or_meter_id()` | keep | — |
| 16 | `append_rls_organization_id_on_meter_commissioning_insert` | `meter_commissionings` | `append_rls_organization_id_by_metering_hardware_install_session()` | keep | — |
| 17 | `append_rls_organization_id_on_directive_batch_execution_insert` | `directive_batch_executions` | `append_rls_organization_id_by_directive_batch_id()`¹ | **rename** | **#16** → `…_on_meter_command_batch_execution_insert` ON `meter_command_batch_executions`; function → `by_meter_command_batch_id()` |
| 18 | `append_rls_organization_id_on_issue_insert` | `issues` | `append_rls_organization_id_by_meter_id()` | keep | — |
| 19 | `append_rls_organization_id_on_transaction_insert` | `transactions` | `append_rls_organization_id_by_order_id()` | keep | — |

¹ Function rename is register #16; trigger DDL unchanged except name + target table.

**Cross-check:** 27 public triggers in legacy chain − 5 on excluded/dropped tables − 3 Make.com (#6, parameterized) = **19 keep** ✓

### H5b — Auth triggers — signed off 2026-07-09

| trigger | ON table | function | timing | decision |
|---------|----------|----------|--------|----------|
| `on_auth_user_created` | `auth.users` | `handle_new_user()` | AFTER INSERT | **keep** |
| `on_auth_user_updated` | `auth.users` | `handle_update_user()` | AFTER UPDATE | **keep** |

### H5c — Admin org GUC sync trigger — signed off 2026-07-09

**Add** (register **#22**, not in legacy chain):

| trigger | ON table | function | timing | register |
|---------|----------|----------|--------|----------|
| `sync_admin_organization_id_guc` | `organizations` | `sync_admin_organization_id_guc()` | AFTER INSERT OR UPDATE OF `organization_type` OR DELETE | **#22** |

Maintains `app.admin_organization_id` GUC for `rls_check_if_admin_org_member()`. Full spec: ADR-007 Amendment + Programmability adjustments §3.

## Register — functions (all batches)

| function | batch | action | register § | rationale | notes |
|----------|-------|--------|------------|-----------|-------|
| `rls_check_if_nxt_member()` | H1c | **rename + redesign** | **#22** | H1c 2026-07-09 | → `rls_check_if_admin_org_member()`; GUC-backed; `STABLE` |
| `rls_check_if_lender()` | H1 | keep |  | H1a 2026-07-09 | JWT organization_type = LENDER |
| `rls_get_member_org_id()` | H1 | keep |  | provisional | JWT organization_id |
| `append_rls_organization_id_by_account_id()` | H1b | keep + redesign | #23 | H1b 2026-07-09 | dead join to `organizations` removed; triggers: `append_rls_organization_id_on_member_insert` ON `members` |
| `append_rls_organization_id_by_grid_id()` | H1b | keep + redesign | #23 | H1b 2026-07-09 | delegates to `rls_org_id_from_grid()`; triggers: `append_rls_organization_id_on_agent_insert` ON `agents`, `append_rls_organization_id_on_customer_insert` ON `customers`, `append_rls_organization_id_on_dcus_insert` ON `dcus`, `append_rls_organization_id_on_directive_batch_insert` ON `directive_batches`, `append_rls_organization_id_on_energy_cabin_insert` ON `energy_cabins`, `append_rls_organization_id_on_mppt_insert` ON `mppts`, `append_rls_organization_id_on_pole_insert` ON `poles`, `append_rls_organization_id_on_route_insert` ON `routers` |
| `append_rls_organization_id_by_historical_grid_id()` | H1a | **drop** | **#21** | H1a 2026-07-09 | Orphan — no trigger |
| `append_rls_organization_id_by_connection_id()` | H1b | keep + redesign | #23 | H1b 2026-07-09 | delegates to `rls_org_id_from_connection()`; triggers: `append_rls_organization_id_on_requested_connection_meters_inser` ON `connection_requested_meters`, `append_rls_organization_id_on_meter_insert` ON `meters` |
| `append_rls_organization_id_by_customer_id()` | H1b | keep + redesign | #23 | H1b 2026-07-09 | delegates to `rls_org_id_from_customer()`; triggers: `append_rls_organization_id_on_connection_insert` ON `connections`, `append_rls_organization_id_on_note_insert` ON `notes` |
| `append_rls_organization_id_by_customer_id_or_agent_id_or_connec()` | H1b | keep + redesign | #23 | H1b 2026-07-09 | branches delegate to helpers; 2nd dead lookup removed; triggers: `append_rls_organization_id_on_wallet_insert` ON `wallets` |
| `append_rls_organization_id_by_dcu_id_or_meter_id()` | H1b | keep + redesign | #23 | H1b 2026-07-09 | branches delegate to `rls_org_id_from_dcu()` / `rls_org_id_from_meter()`; triggers: `append_rls_organization_id_on_meter_install_session_insert` |
| `append_rls_organization_id_by_directive_batch_id()` | H1a + H1b | rename + redesign | #16, #23 | H1a + H1b 2026-07-09 | → `append_rls_organization_id_by_meter_command_batch_id()`; delegates to `rls_org_id_from_grid()` |
| `append_rls_organization_id_by_meter_id()` | H1b | keep + redesign | #23 | H1b 2026-07-09 | delegates to `rls_org_id_from_meter()`; triggers: `append_rls_organization_id_on_issue_insert` ON `issues` |
| `append_rls_organization_id_by_metering_hardware_install_session()` | H1b | keep + redesign | #23 | H1b 2026-07-09 | delegates to `rls_org_id_from_meter()` via session's meter_id; triggers: `append_rls_organization_id_on_meter_commissioning_insert` |
| `append_rls_organization_id_by_order_id()` | H1b | keep + redesign | #23 | H1b 2026-07-09 | delegates to `rls_org_id_from_grid()` via historical_grid_id; triggers: `append_rls_organization_id_on_transaction_insert` ON `transactions` |
| `rls_org_id_from_grid(grid_id)` | H1b | **add** | #23 | H1b 2026-07-09 | new leaf helper; `LANGUAGE sql STABLE SECURITY DEFINER` |
| `rls_org_id_from_customer(customer_id)` | H1b | **add** | #23 | H1b 2026-07-09 | new helper; delegates to `rls_org_id_from_grid()` |
| `rls_org_id_from_connection(connection_id)` | H1b | **add** | #23 | H1b 2026-07-09 | new helper; delegates to `rls_org_id_from_customer()` |
| `rls_org_id_from_agent(agent_id)` | H1b | **add** | #23 | H1b 2026-07-09 | new helper; delegates to `rls_org_id_from_grid()` |
| `rls_org_id_from_meter(meter_id)` | H1b | **add** | #23 | H1b 2026-07-09 | new helper; delegates to `rls_org_id_from_connection()` |
| `rls_org_id_from_dcu(dcu_id)` | H1b | **add** | #23 | H1b 2026-07-09 | new helper; delegates to `rls_org_id_from_grid()` |
| `handle_new_user()` | H2 | keep |  | H2 2026-07-09 | auth.users AFTER INSERT — creates account row; triggers: `on_auth_user_created` ON `auth.users` |
| `handle_update_user()` | H2 | keep |  | H2 2026-07-09 | auth.users AFTER UPDATE — syncs account.organization_id from auth app_metadata; triggers: `on_auth_user_updated` ON `auth.users` |
| `get_grid_status(grid_id integer)` | H2 | keep + redesign | **#26** | H2 2026-07-09 | RPC — pegasus grid dashboard; drop `are_all_dcus_online` + `are_all_dcus_under_high_load_threshold` from return type (register #17); mark `STABLE` |
| `find_energy_topup_revenue(grid_id, start_date, end_date)` | H3 | keep + STABLE | **#27** | H3 2026-07-09 | RPC — revenue aggregate on orders.historical_grid_id; mark `STABLE` |
| `find_top_spenders(grid_id, limit_count, start_date, end_date)` | H3 | keep + STABLE + fix | **#27** | H3 2026-07-09 | RPC — top spenders; mark `STABLE`; GROUP BY customer fields only (drop meter id from group) |
| `lock_next_order_and_wallets(uuid)` | H3 | keep + harden | **#24** | H3 2026-07-09 | RPC — pessimistic lock (20251231155410); `SET search_path TO ''` (#24); logic confirmed keep |

## Register — triggers (H5)

| trigger | on table | function | action | register § | rationale | notes |
|---------|----------|----------|--------|------------|-----------|-------|
| append_rls_organization_id_on_agent_insert | agents | append_rls_organization_id_by_grid_id() | keep |  | H5a 2026-07-09 |  |
| append_rls_organization_id_on_requested_connection_meters_inser | connection_requested_meters | append_rls_organization_id_by_connection_id() | keep |  | H5a 2026-07-09 | truncated legacy name |
| append_rls_organization_id_on_connection_insert | connections | append_rls_organization_id_by_customer_id() | keep |  | H5a 2026-07-09 |  |
| append_rls_organization_id_on_customer_insert | customers | append_rls_organization_id_by_grid_id() | keep |  | H5a 2026-07-09 |  |
| append_rls_organization_id_on_dcus_insert | dcus | append_rls_organization_id_by_grid_id() | keep |  | H5a 2026-07-09 |  |
| append_rls_organization_id_on_directive_batch_execution_insert | directive_batch_executions | append_rls_organization_id_by_directive_batch_id() | rename | #16 | H5a 2026-07-09 | → `…_on_meter_command_batch_execution_insert` ON `meter_command_batch_executions` |
| append_rls_organization_id_on_directive_batch_insert | directive_batches | append_rls_organization_id_by_grid_id() | rename | #16 | H5a 2026-07-09 | → `…_on_meter_command_batch_insert` ON `meter_command_batches` |
| append_rls_organization_id_on_energy_cabin_insert | energy_cabins | append_rls_organization_id_by_grid_id() | keep |  | H5a 2026-07-09 |  |
| append_rls_organization_id_on_issue_insert | issues | append_rls_organization_id_by_meter_id() | keep |  | H5a 2026-07-09 |  |
| append_rls_organization_id_on_member_insert | members | append_rls_organization_id_by_account_id() | keep |  | H5a 2026-07-09 |  |
| append_rls_organization_id_on_meter_commissioning_insert | meter_commissionings | append_rls_organization_id_by_metering_hardware_install_session() | keep |  | H5a 2026-07-09 |  |
| append_rls_organization_id_on_meter_install_session_insert | metering_hardware_install_sessions | append_rls_organization_id_by_dcu_id_or_meter_id() | keep |  | H5a 2026-07-09 |  |
| append_rls_organization_id_on_meter_insert | meters | append_rls_organization_id_by_connection_id() | keep |  | H5a 2026-07-09 |  |
| append_rls_organization_id_on_mppt_insert | mppts | append_rls_organization_id_by_grid_id() | keep |  | H5a 2026-07-09 |  |
| append_rls_organization_id_on_note_insert | notes | append_rls_organization_id_by_customer_id() | keep |  | H5a 2026-07-09 |  |
| append_rls_organization_id_on_pole_insert | poles | append_rls_organization_id_by_grid_id() | keep |  | H5a 2026-07-09 |  |
| append_rls_organization_id_on_route_insert | routers | append_rls_organization_id_by_grid_id() | rename | #10 | H5a 2026-07-09 | → `…_on_router_insert` |
| append_rls_organization_id_on_transaction_insert | transactions | append_rls_organization_id_by_order_id() | keep |  | H5a 2026-07-09 |  |
| append_rls_organization_id_on_wallet_insert | wallets | append_rls_organization_id_by_customer_id_or_agent_id_or_connec() | keep |  | H5a 2026-07-09 |  |
| on_auth_user_created | auth.users | handle_new_user() | keep |  | H5b 2026-07-09 | H2 signed off |
| on_auth_user_updated | auth.users | handle_update_user() | keep |  | H5b 2026-07-09 | H2 signed off |
| sync_admin_organization_id_guc | organizations | sync_admin_organization_id_guc()¹ | **add** | **#22** | H5c 2026-07-09 | Not in legacy chain; maintains GUC `app.admin_organization_id` |

¹ Proposed names for Task 5 — trigger + handler function (see register #22, Programmability §3).

**Workflow:**

1. Maintainer reviews batches H1–H5; edit actions in the tables above.
2. On sign-off per batch: sync confirmed drops/renames/enum value drops to `002b-schema-deviation-register.md` **Programmability adjustments**.
3. Task 3 complete when every row has a final action and register is synced.

**Out of scope:** dropped/excluded/parameterize objects (Task 3a); table columns (Task 3b complete).

**H1 (RLS helpers) fully closed 2026-07-09** — H1a, H1b, H1c all signed off.

**H2 (auth + platform RPCs) fully closed 2026-07-09** — `handle_new_user()` keep; `handle_update_user()` keep; `get_grid_status()` keep + redesign (#26).

**H3 (payments RPCs) fully closed 2026-07-09** — `lock_next_order_and_wallets()` keep (#24 search_path); `find_energy_topup_revenue()` keep + `STABLE` (#27); `find_top_spenders()` keep + `STABLE` + GROUP BY fix (#27).

**H4 (enum value trim) fully closed 2026-07-09** — H4a: `external_system_enum` drop 3 (#28); H4b/H4c/H4e keep all; H4d drop `AUTO_PAYOUT_GENRATION_REPORT` (#29).

**H5 fully closed 2026-07-09** — H5a: keep 19 + renames #10/#16; H5b: keep 2 auth; H5c: add `sync_admin_organization_id_guc` (#22).

**Task 3c complete.** Next: **Task 3d** (database-wide performance audit).
