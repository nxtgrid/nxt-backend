# Schema Performance Audit (working review)

**Companion to:** `002b-database-baseline.md` — **Task 3d**
**Status:** **Complete 2026-07-10** — D1–D4 all signed off (registers #30, #31, #32; D4 no register entry — no findings)
**Generated:** 2026-07-10 — reference DB (`legacy/supabase/migrations`, `npx supabase@2.54.10 db start`),
queried live (`pg_indexes`, `information_schema`, `pg_policies`) rather than reading migration SQL, since
Docker was available this session.

## Batch plan (proposed)

| batch | scope | status |
|-------|-------|--------|
| **D1** | Enumerate indexes on keep tables; FK/RLS coverage gap analysis; redundancy check | **signed off 2026-07-10** — register #30 |
| **D2** | Function volatility (RLS helpers + RPCs + trigger functions) | **signed off 2026-07-10** — register #31 |
| **D3** | RLS policy invocation pattern normalization (bare vs. subquery-wrapped) | **signed off 2026-07-10** — register #32 |
| **D4** | Remaining triggers/views (`append_rls_*` already resolved in 3c — register #23) | **signed off 2026-07-10** — no findings, no register entry |

## Purpose

A **structural/static** performance audit of the OSS baseline schema, done once every keep object
(tables, columns, enums, functions, triggers, renames) is locked in from Task 3a–3c, and before Task 5
authors the init migration / Task 6 diffs it against the old chain — so findings are inputs to the
migration, not a retrofit, and any resulting schema change is registered before the A/B diff runs.

**Not in scope:** empirical, load-driven tuning (`EXPLAIN ANALYZE` under realistic data volume). There
is no data yet — per this plan's non-goals, "Any data migration — this plan ships schema only." That
kind of tuning belongs to a later capability-import or production-readiness pass, once real usage
exists.

## Scope

| concern | seed from | notes |
|---------|-----------|-------|
| Function volatility | `pg_proc.provolatile` on keep functions (Task 3c list) | Legacy chain leaves every function at the implicit default `VOLATILE` — confirmed no `CREATE FUNCTION` declares `STABLE`/`IMMUTABLE`. RLS-attached functions matter most: unmarked, they can be re-evaluated once per row instead of once per statement. |
| RLS policy invocation pattern | `pg_policies` USING/WITH CHECK clauses | Legacy chain is inconsistent: some policies wrap helper calls in a subquery (`( SELECT public.fn() AS fn )`, plan-cacheable), others call bare (`public.fn()`). Distinct from volatility. |
| Indexes on keep tables | **new** — reference DB (`pg_indexes` / `\d` on keep tables) | Not previously inventoried (Task 2's inventory has no "index" kind). Check: FK columns indexed, RLS-predicate columns indexed (e.g. `rls_organization_id`), redundant/overlapping indexes, coverage survives Task 3 renames (`meter_command_batches` etc.). |
| Trigger design overhead | Task 3c H1b (`append_rls_*` group) + H5 (all keep triggers) | Whether the `BEFORE INSERT` denormalization pattern is the right shape, or any function could be simplified/merged. |
| View definitions | Keep views (`002b-schema-inventory.md`) | e.g. `meters_with_account_and_statuses` — wide view, many joins; check plan shape. |

## Register

### Function volatility — D2 — **confirmed 2026-07-10, register #31**

**Method:** enumerated all keep functions from Task 3c's final register (26: 20 legacy-chain keep +
6 new `rls_org_id_from_*` helpers) and cross-checked each against Task 3c's volatility decisions.
**Finding: only 2 functions were left without an explicit volatility decision** — everything else was
already decided during Task 3c (H1b/H1c/H2/H3), confirming those decisions here rather than
re-litigating them.

#### Already decided in Task 3c — confirmed, not re-litigated

| function | volatility | register § | where decided |
|----------|-----------|------------|----------------|
| `rls_check_if_admin_org_member()` (renamed from `rls_check_if_nxt_member()`) | `STABLE` | #22 | H1c |
| `rls_org_id_from_grid/customer/connection/agent/meter/dcu()` (6 new helpers) | `STABLE` | #23 | H1b |
| `get_grid_status()` | `STABLE` | #26 | H2 |
| `find_energy_topup_revenue()` | `STABLE` | #27 | H3 |
| `find_top_spenders()` | `STABLE` | #27 | H3 |
| `lock_next_order_and_wallets()` | `VOLATILE` (unmarked, correct) | #24 (search_path only) | H3 — atomic `FOR UPDATE SKIP LOCKED` write, side effects |
| `append_rls_organization_id_by_*()` ×10 trigger functions | `VOLATILE` (unmarked, correct) | #23 | H1b — explicitly decided "no further volatility decision needed"; trigger functions are invoked once per row by the trigger manager, not through query-expression evaluation, so `STABLE`/`IMMUTABLE` marking has no planner effect for them either way |
| `handle_new_user()` | `VOLATILE` (unmarked, correct) | — | H2 — performs `INSERT` into `accounts`, a real side effect |
| `handle_update_user()` | `VOLATILE` (unmarked, correct) | — | H2 — performs `UPDATE` on `accounts`, a real side effect |
| `sync_admin_organization_id_guc()` (new) | `VOLATILE` (unmarked, correct) | #22 | H5c — calls `set_config()`, a session-state side effect |

#### New findings — D2 — confirmed 2026-07-10, action: mark `STABLE`, register #31

| function | current | proposed | rationale | notes |
|----------|---------|----------|-----------|-------|
| `rls_check_if_lender()` | unmarked (`VOLATILE`) | **`STABLE`** | Single `RETURN` reading `auth.jwt() -> 'app_metadata' ->> 'organization_type'` — no side effects, same value for the whole statement (JWT claims are fixed per request). Identical shape/rationale to `rls_check_if_admin_org_member()` (register #22), already `STABLE`. Used in **4 policies** across 4 keep tables (`accounts`, `customers`, `grids`, `orders`). | Already has `SECURITY DEFINER` + `SET search_path TO ''` — spot-checked, no hardening needed |
| `rls_get_member_org_id()` | unmarked (`VOLATILE`) | **`STABLE`** | Single `RETURN` reading `auth.jwt() -> 'app_metadata' ->> 'organization_id'` — no side effects, same value for the whole statement. **The single most-invoked RLS helper in the schema** — used in **~24 policies across ~20 keep tables** (`accounts`, `agents`, `connection_requested_meters`, `connections`, `customers`, `dcus`, `meter_command_batches`, `energy_cabins`, `issues`, `members`, `meter_commissionings`, `metering_hardware_install_sessions`, `meters`, `mppts`, `notes`, `orders`, `organizations`, `poles`, `routers`, `transactions`) — highest-value `STABLE` marking in the whole audit given call volume. | Already has `SECURITY DEFINER` + `SET search_path TO ''` — spot-checked, no hardening needed |

**Why this matters:** unmarked (`VOLATILE`) functions used in an RLS policy's `USING`/`WITH CHECK`
clause **cannot** be evaluated once per statement — Postgres must treat them as potentially returning a
different value on every row and re-invoke them per row. Marking `STABLE` (safe here — same call,
same result, within one statement) lets the planner cache the result once per statement instead,
which matters most for exactly these two functions given how many rows-per-query and how many
policies they gate.

### RLS policy invocation pattern — D3 — **confirmed 2026-07-10, register #32**

**Method:** all 123 `CREATE POLICY` statements live in a single migration file (the initial dump) — no
later migration touches a policy (`ALTER POLICY`/`DROP POLICY` — none found), so parsing the SQL
directly is exact, no DB needed. Extracted every `USING`/`WITH CHECK` clause on the 35 keep tables (91
of the 123) and looked specifically for calls to the 3 helper functions actually used **inside RLS
policies** (`rls_check_if_nxt_member()` → renamed `rls_check_if_admin_org_member()`,
`rls_check_if_lender()`, `rls_get_member_org_id()`) — the `append_rls_*` functions are **trigger**
functions (already covered in Task 3c H1b), not policy-attached, so out of scope here.

**Finding:** of 69 helper-function calls across keep-table policies, **51 are already
subquery-wrapped** (`( SELECT public.fn() AS fn )` — the Postgres/Supabase-recommended pattern that
lets the planner treat the call as an `InitPlan`, evaluated once per statement and cached, rather than
re-invoked as part of every row's filter expression) and **18 are bare** (`public.fn()` called
directly). This is exactly the inconsistency the plan flagged. A clean pattern emerged: **every bare
call is on an `INSERT`/`UPDATE` policy — zero are on `SELECT` policies** (all 26 `SELECT`-side
`rls_check_if_nxt_member()`/`rls_check_if_lender()`/`rls_get_member_org_id()` calls are already
wrapped). Looks like whoever wrote the `INSERT`/`UPDATE` policies just used the simpler bare form,
inconsistently with the `SELECT` policies for the same tables/functions.

**Why it still matters for `INSERT`/`UPDATE`, not just `SELECT`:** a single-row `INSERT` only
evaluates its `WITH CHECK` once regardless of wrapping, so the wrap is "free" there — but a bulk
`UPDATE` (e.g. `UPDATE meters SET … WHERE grid_id = X` touching many rows) re-evaluates a bare
`USING` clause per candidate row, same as `SELECT`. Normalizing removes the inconsistency and closes
that bulk-`UPDATE` gap, and pairs with D2: both functions are about to be marked `STABLE`, which is
what makes the `InitPlan` caching behind the wrap valid in the first place (an unmarked/`VOLATILE`
function can't safely be cached across rows even when wrapped).

#### Confirmed 2026-07-10 — normalize all 18 bare calls to the wrapped form, register #32

| table | policy | clause | function | current | proposed |
|-------|--------|--------|----------|---------|----------|
| `grids` | Allow NXT Grid to insert | `WITH CHECK` | `rls_check_if_admin_org_member()` | bare | `( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member )` |
| `meters` | Allow NXT Grid to insert | `WITH CHECK` | `rls_check_if_admin_org_member()` | bare | wrapped |
| `notes` | Allow NXT Grid to insert | `WITH CHECK` | `rls_check_if_admin_org_member()` | bare | wrapped |
| `organizations` | Allow NXT Grid to insert | `WITH CHECK` | `rls_check_if_admin_org_member()` | bare | wrapped |
| `pd_sites` | Allow NXT Grid to insert | `WITH CHECK` | `rls_check_if_admin_org_member()` | bare | wrapped |
| `poles` | Allow NXT Grid to insert | `WITH CHECK` | `rls_check_if_admin_org_member()` | bare | wrapped |
| `wallets` | Allow NXT Grid to insert | `WITH CHECK` | `rls_check_if_admin_org_member()` | bare | wrapped |
| `accounts` | Allow NXT Grid to update | `USING` | `rls_check_if_admin_org_member()` | bare | wrapped |
| `connections` | Allow NXT Grid to update | `USING` | `rls_check_if_admin_org_member()` | bare | wrapped |
| `grids` | Allow NXT Grid to update | `USING` | `rls_check_if_admin_org_member()` | bare | wrapped |
| `meters` | Allow NXT Grid to update | `USING` | `rls_check_if_admin_org_member()` | bare | wrapped |
| `organizations` | Allow NXT Grid to update | `USING` | `rls_check_if_admin_org_member()` | bare | wrapped |
| `pd_site_submissions` | Allow NXT Grid to update | `USING` | `rls_check_if_admin_org_member()` | bare | wrapped |
| `pd_sites` | Allow NXT Grid to update | `USING` | `rls_check_if_admin_org_member()` | bare | wrapped |
| `notes` | Allow org members to insert | `WITH CHECK` | `rls_get_member_org_id()` | bare | `( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id ) = rls_organization_id` |
| `poles` | Allow org members to insert | `WITH CHECK` | `rls_get_member_org_id()` | bare | wrapped (same form) |
| `accounts` | Allow org members to update | `USING` | `rls_get_member_org_id()` | bare | `( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id ) = organization_id` |
| `orders` | Allow org members to update | `USING` | `rls_get_member_org_id()` | bare | `( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id ) = rls_organization_id` |

**Already consistent — no change (51 policies):** every `SELECT` policy calling one of these 3
functions, across all 35 keep tables, is already wrapped. Full list not repeated here — see
`002b-schema-inventory.md`/reference DB `pg_policies` for the untouched 51.

**Out of scope, no change:** policies with no helper-function call — `true` (Grafana/Make/public
read-only grants, `wallets` "TEMPORARILY OPEN"), plain column comparisons with no function call, and
the `notes` "Allow authors to update their own" policy (a correlated subselect against `accounts`, a
different pattern entirely — not a helper-function call, out of this concern's scope).

### Indexes — D1

**Method:** reference DB was available this session (Docker reachable outside the sandbox) — queried
live rather than parsing migration SQL. Scope: the **35 keep tables** (Task 3a/3b final list, target
names used for the two Task 3 renames). 4 keep **views** have no indexes of their own (rely on base-table
indexes) — not separately enumerated. 22 drop/exclude/parameterize tables' indexes are out of scope
(never reach the init migration).

- `pg_indexes` on the 35 keep tables → **105 existing indexes** (140 total in the reference DB).
- FK constraints (`information_schema.table_constraints`/`key_column_usage`) cross-referenced against
  each index's **leading column** → gap list below.
- A separate sweep for **soft FK columns** (`%_id` columns with no formal `FOREIGN KEY` constraint, the
  shape that produced register #25) found no new candidates — the 16 hits are all external/opaque IDs
  (`external_id`, Telegram chat/thread IDs, Epicollect IDs) or `wallets.goldring_migration_id` (already
  dropping, register #19), not internal join paths.

#### Existing indexes (103 rows after folding 2 already-registered renames)

<details>
<summary>Full list — click to expand</summary>

| table | index | action | register § | rationale | notes |
|-------|-------|--------|------------|-----------|-------|
| `accounts` | `PK_5a7a02c20412299d198e097a8fe` | keep | | | |
| `accounts` | `REL_13bf998d703e7d4c7b9a90f4f7` | keep | | | |
| `accounts` | `UQ_0ec8c228e89a95aeb4af9ee3226` | keep | | | |
| `accounts` | `UQ_3ffa9ce30e56b6d2abf0a465f5f` | keep | | | |
| `agents` | `PK_9c653f28ae19c5884d5baf6a1d9` | keep | | | |
| `agents` | `REL_df520decc9e003a843d8edd986` | keep | | | |
| `agents` | `idx_agents_rls_organization_id` | keep | | | |
| `api_keys` | `PK_5c8a79801b44bd27b79228e1dad` | keep | | | |
| `api_keys` | `UQ_e42cf55faeafdcce01a82d24849` | keep | | | |
| `audits` | `PK_b2d7a2089999197dc7024820f28` | keep | | | |
| `banks` | `PK_3975b5f684ec241e3901db62d77` | keep | | | |
| `connection_requested_meters` | `PK_ef90f8d1aa3055757e0ff8e4aa7` | keep | | | |
| `connection_requested_meters` | `idx_connection_requested_meters_rls_organization_id` | keep | | | |
| `connections` | `PK_0a1f844af3122354cbd487a8d03` | keep | | | |
| `connections` | `idx_connection_customer_id` | keep | | | |
| `connections` | `idx_connections_rls_organization_id` | keep | | | |
| `customers` | `PK_133ec679a801fab5e070f73d3ea` | keep | | | |
| `customers` | `REL_ebcc29963874e55053e8ee80be` | keep | | | |
| `customers` | `idx_customer_grid_id` | keep | | | |
| `customers` | `idx_customers_rls_organization_id` | keep | | | |
| `dcus` | `IDX_9c4f5693f52e6e5e51e1ca05af` | keep | | | |
| `dcus` | `PK_82192607fa5119101a78fe53b7d` | keep | | | |
| `dcus` | `REL_9334b587e6e5291f8ccd1b11c4` | keep | | | |
| `dcus` | `idx_dcus_rls_organization_id` | keep | | | |
| `energy_cabins` | `PK_59ecb7965974e45fdc2f243bda7` | keep | | | |
| `energy_cabins` | `idx_energy_cabins_location_geom` | keep | | | |
| `energy_cabins` | `idx_energy_cabins_rls_organization_id` | keep | | | |
| `grids` | `PK_840d40fdcde1e935afd43082aca` | keep | | | |
| `grids` | `UQ_61f08f04c9f0f1d3afd24b9be0b` | keep | | | |
| `issues` | `PK_9d8ecbbeff46229c700f0449257` | keep | | | |
| `issues` | `idx_issues_open` | keep | | | Partial index `WHERE issue_status = 'OPEN'`; leading col `rls_organization_id` |
| `issues` | `idx_issues_rls_organization_id` | keep | | | |
| `members` | `PK_28b53062261b996d9c99fa12404` | keep | | | |
| `members` | `REL_fd9dfb97e21b75fc45d42aa614` | keep | | | |
| `members` | `idx_members_rls_organization_id` | keep | | | |
| `meter_command_batch_executions` (was `directive_batch_executions`) | `PK_9494ab23abdfe4e59f3f29842d5` | keep | | | |
| `meter_command_batch_executions` | `idx_directive_batch_executions_rls_organization_id` → `idx_meter_command_batch_executions_rls_organization_id` | keep + rename | #16 | Align with table rename | `ALTER INDEX … RENAME` at cutover |
| `meter_command_batches` (was `directive_batches`) | `PK_92d424811a3fd49a8020eadb97a` | keep | | | |
| `meter_command_batches` | `idx_directive_batches_rls_organization_id` → `idx_meter_command_batches_rls_organization_id` | keep + rename | #16 | Align with table rename | `ALTER INDEX … RENAME` at cutover |
| `meter_commissionings` | `PK_69fce91302a5dc8dd3db274717b` | keep | | | |
| `meter_commissionings` | `idx_meter_commissionings_rls_organization_id` | keep | | | |
| `meter_interactions` | `idx_meter_interaction_batch_execution_id` | keep | | | Composite `(batch_execution_id, meter_interaction_status)` |
| `meter_interactions` | `idx_meter_interaction_meter_commissioning_id` | keep | | | |
| `meter_interactions` | `idx_meter_interaction_meter_id_extra` | keep | | | Composite `(meter_id, meter_interaction_type, created_at DESC)` |
| `meter_interactions` | `meter_interactions_order_id_key` | keep | | | Unique — 1:1 with `orders` |
| `meter_interactions` | `meter_interactions_pkey` | keep | | | |
| `metering_hardware_imports` | `PK_665b32b395a7675648ed77da4f6` | keep | | | Only index on this table — see Tier 1/2 gaps below |
| `metering_hardware_install_sessions` | `PK_4eb998262e5c773a89dfe3ea0e1` | keep | | | |
| `metering_hardware_install_sessions` | `REL_4eb64f5decb7250cfa993410c1` | keep | | | |
| `metering_hardware_install_sessions` | `REL_be64a09dc738420a409cb96026` | keep | | | |
| `metering_hardware_install_sessions` | `idx_metering_hardware_install_sessions_rls_organization_id` | keep | | | |
| `meters` | `IDX_36d092cd2d89756f62421011bb` | keep | | | Unique `(external_reference, external_system)` |
| `meters` | `PK_0a71b52dbb545fa36efaf070583` | keep | | | |
| `meters` | `REL_5606d6ec5ab568377509edc526` | keep | | | |
| `meters` | `REL_86d4557a79e374b5c55cb3b66d` | keep | | | |
| `meters` | `idx_meter_connection_id` | keep | | | |
| `meters` | `idx_meter_dcu_id` | keep | | | |
| `meters` | `idx_meters_rls_organization_id` | keep | | | |
| `meters` | `meters_device_id_key` | drop (follows column drop) | register #12 / col. adj. §4 | Column `device_id` dropped | Index disappears with the column; no separate DDL |
| `mppts` | `PK_c8a4dc57b932c173f6c579804c0` | keep | | | |
| `mppts` | `idx_mppts_rls_organization_id` | keep | | | |
| `notes` | `PK_af6206538ea96c4e77e9f400c3d` | keep | | | |
| `notes` | `idx_notes_rls_organization_id` | keep | | | |
| `notification_parameters` | `PK_338f36e72b69406bed36e054e09` | keep | | | |
| `notifications` | `IDX_14f6e0badc019bbdd2f66f7e8a` | keep | | | On `notification_status` |
| `notifications` | `PK_6a72c3c0f683f6462415e653c3a` | keep | | | |
| `orders` | `PK_710e2d4957aa5878dfe94e4ac2f` | keep | | | |
| `orders` | `REL_093ca3525311b8a12f6cf6b1c9` | drop (follows column drop) | register #1 / col. adj. §1 | Column `directive_id` dropped | Index disappears with the column; no separate DDL |
| `orders` | `REL_92081072063eaf51300ab6c267` | keep | | | Unique on `ussd_session_id` |
| `orders` | `REL_a53c58bdb5ae0193f17497c81b` | drop (follows column drop) | register #7 / col. adj. §2 | Column `meter_credit_transfer_id` dropped | Index disappears with the column; no separate DDL |
| `orders` | `idx_orders_energy_topup_grid` | keep | | | Partial, see redundancy note below |
| `orders` | `idx_orders_energy_topup_receiver` | keep | | | Partial, see redundancy note below |
| `orders` | `idx_orders_historical_grid_id` | keep | | | |
| `orders` | `idx_orders_meta_receiver_id` | keep | | | |
| `orders` | `idx_orders_order_optimized` | keep | | | On `updated_at DESC` |
| `orders` | `idx_orders_rls_organization_id` | keep | | | |
| `orders` | `idx_orders_rls_sender_receiver` | keep | | | Composite `(meta_sender_type, meta_sender_id, meta_receiver_type, meta_receiver_id)` |
| `organizations` | `PK_6b031fcd0863e3f6b44230163f9` | keep | | | Plus register #22's new partial unique `one_platform_operator_org` (already registered, not re-listed here) |
| `pd_site_submissions` | `idx_pd_site_submissions_location_geom` | keep | | | PostGIS `gist` |
| `pd_site_submissions` | `idx_pd_site_submissions_outline_geom` | keep | | | PostGIS `gist` |
| `pd_site_submissions` | `pd_public_submissions_pkey` | keep | | | |
| `pd_sites` | `idx_pd_sites_location_geom` | keep | | | PostGIS `gist` |
| `pd_sites` | `idx_pd_sites_outline_geom` | keep | | | PostGIS `gist` |
| `pd_sites` | `pd_sites_pkey` | keep | | | |
| `poles` | `PK_1f4336016e8de1d62acb05ce829` | keep | | | |
| `poles` | `UQ_67112e4334d7090a571d2fff42a` | keep | | | |
| `poles` | `idx_poles_location_geom` | keep | | | PostGIS `gist` |
| `poles` | `idx_poles_rls_organization_id` | keep | | | |
| `routers` | `PK_b6d283f1e40d4942dedbc0cb27a` | keep | | | |
| `routers` | `idx_routers_rls_organization_id` | keep | | | |
| `solcast_cache` | `PK_a0b1d6bdbc5ca0056201a1c6dd0` | keep | | | |
| `transactions` | `IDX_5c820aa56824815f8e19484ff5` | keep | | | Composite `(wallet_id, transaction_status, created_at)` |
| `transactions` | `PK_a219afd8dd77ed80f5a862f1db9` | keep | | | |
| `transactions` | `idx_transactions_rls_organization_id` | keep | | | |
| `ussd_session_hops` | `PK_56d984bae21ce6e86848a8a3c04` | keep | | | |
| `ussd_sessions` | `PK_c18f16f36e79b2fb87783476830` | keep | | | |
| `wallets` | `PK_8402e5df5a30a229380e83e4f7e` | keep | | | |
| `wallets` | `REL_6580899a2293de27787376887f` | keep | | | Unique on `customer_id` |
| `wallets` | `REL_8db1f4e4f8122bd25d50ad96b2` | keep | | | Unique on `meter_id` |
| `wallets` | `REL_e63e504d8e35ef37a2c56b75eb` | keep | | | Unique on `connection_id` |
| `wallets` | `REL_f499c61c6d6a0ac3f794d966ed` | keep | | | Unique on `organization_id` |
| `wallets` | `REL_f5782e05e8688f0cfbb5c4a52c` | keep | | | Unique on `agent_id` |
| `wallets` | `idx_wallets_rls_organization_id` | keep | | | |

</details>

#### Gap findings — new indexes — **confirmed 2026-07-10, register #30**

Cross-referencing every keep table's FK columns and RLS-predicate columns against the existing index
list above surfaced a systemic pattern: **`rls_organization_id`-style denormalized columns are
consistently indexed (that convention is solid), but plain FK columns on most child tables are not.**
Register #25 (`accounts.organization_id`, found during Task 3c H1b) was the first instance of this
gap; this pass is the systematic sweep the plan called for.

**Tier 1 — RLS-predicate / already-established-convention gaps (direct analog of register #25) — confirmed, action: add, register #30:**

| table | column | references | proposed index | rationale |
|-------|--------|------------|-----------------|-----------|
| `grids` | `organization_id` | `organizations.id` | `idx_grids_organization_id` | RLS predicate ("Allow org members to select" uses `organization_id`) **and** FK; every other org-owning/org-scoped table has this indexed — direct analog of register #25 (`accounts.organization_id`). |
| `metering_hardware_imports` | `rls_organization_id` | `organizations.id` | `idx_metering_hardware_imports_rls_organization_id` | RLS predicate — table currently has **zero** non-PK indexes; every sibling keep table indexes its `rls_organization_id` column. |
| `meter_command_batch_executions` | `meter_command_batch_id` (was `directive_batch_id`) | `meter_command_batches.id` | `idx_meter_command_batch_executions_meter_command_batch_id` | Parent-lookup FK (register #16 rename) — no supporting index; needed to join batch executions back to their batch (e.g. batch-level status rollups). |

**Tier 2 — plain FK-column hygiene (no RLS involvement; standard "index every FK" practice — prevents
seq scans on parent-side updates/deletes and speeds child lookups) — confirmed, action: add, register #30:**

| table | column | references | proposed index |
|-------|--------|------------|-----------------|
| `agents` | `grid_id` | `grids.id` | `idx_agents_grid_id` |
| `api_keys` | `account_id` | `accounts.id` | `idx_api_keys_account_id` |
| `audits` | `agent_id` | `agents.id` | `idx_audits_agent_id` |
| `audits` | `author_id` | `accounts.id` | `idx_audits_author_id` |
| `audits` | `connection_id` | `connections.id` | `idx_audits_connection_id` |
| `audits` | `customer_id` | `customers.id` | `idx_audits_customer_id` |
| `audits` | `dcu_id` | `dcus.id` | `idx_audits_dcu_id` |
| `audits` | `grid_id` | `grids.id` | `idx_audits_grid_id` |
| `audits` | `member_id` | `members.id` | `idx_audits_member_id` |
| `audits` | `meter_id` | `meters.id` | `idx_audits_meter_id` |
| `audits` | `organization_id` | `organizations.id` | `idx_audits_organization_id` |
| `connection_requested_meters` | `connection_id` | `connections.id` | `idx_connection_requested_meters_connection_id` |
| `dcus` | `grid_id` | `grids.id` | `idx_dcus_grid_id` |
| `energy_cabins` | `grid_id` | `grids.id` | `idx_energy_cabins_grid_id` |
| `meter_command_batches` | `author_id` | `accounts.id` | `idx_meter_command_batches_author_id` |
| `meter_command_batches` | `grid_id` | `grids.id` | `idx_meter_command_batches_grid_id` |
| `meter_commissionings` | `metering_hardware_install_session_id` | `metering_hardware_install_sessions.id` | `idx_meter_commissionings_metering_hardware_install_session_id` |
| `metering_hardware_imports` | `metering_hardware_install_session_id` | `metering_hardware_install_sessions.id` | `idx_metering_hardware_imports_metering_hardware_install_session_id` |
| `metering_hardware_install_sessions` | `author_id` | `accounts.id` | `idx_metering_hardware_install_sessions_author_id` |
| `metering_hardware_install_sessions` | `dcu_id` | `dcus.id` | `idx_metering_hardware_install_sessions_dcu_id` |
| `metering_hardware_install_sessions` | `meter_id` | `meters.id` | `idx_metering_hardware_install_sessions_meter_id` |
| `meters` | `pole_id` | `poles.id` | `idx_meters_pole_id` |
| `mppts` | `grid_id` | `grids.id` | `idx_mppts_grid_id` |
| `notes` | `author_id` | `accounts.id` | `idx_notes_author_id` |
| `notes` | `connection_id` | `connections.id` | `idx_notes_connection_id` |
| `notes` | `customer_id` | `customers.id` | `idx_notes_customer_id` |
| `notes` | `meter_id` | `meters.id` | `idx_notes_meter_id` |
| `notifications` | `account_id` | `accounts.id` | `idx_notifications_account_id` |
| `notifications` | `grid_id` | `grids.id` | `idx_notifications_grid_id` |
| `notifications` | `notification_parameter_id` | `notification_parameters.id` | `idx_notifications_notification_parameter_id` |
| `notifications` | `organization_id` | `organizations.id` | `idx_notifications_organization_id` |
| `orders` | `author_id` | `accounts.id` | `idx_orders_author_id` |
| `orders` | `receiver_wallet_id` | `wallets.id` | `idx_orders_receiver_wallet_id` |
| `orders` | `sender_wallet_id` | `wallets.id` | `idx_orders_sender_wallet_id` |
| `pd_site_submissions` | `organization_id` | `organizations.id` | `idx_pd_site_submissions_organization_id` |
| `pd_sites` | `operations_grid_id` | `grids.id` | `idx_pd_sites_operations_grid_id` |
| `pd_sites` | `organization_id` | `organizations.id` | `idx_pd_sites_organization_id` |
| `poles` | `grid_id` | `grids.id` | `idx_poles_grid_id` |
| `routers` | `grid_id` | `grids.id` | `idx_routers_grid_id` |
| `transactions` | `order_id` | `orders.id` | `idx_transactions_order_id` |
| `ussd_session_hops` | `ussd_session_id` | `ussd_sessions.id` | `idx_ussd_session_hops_ussd_session_id` |
| `ussd_sessions` | `account_id` | `accounts.id` | `idx_ussd_sessions_account_id` |
| `ussd_sessions` | `bank_id` | `banks.id` | `idx_ussd_sessions_bank_id` |
| `ussd_sessions` | `meter_id` | `meters.id` | `idx_ussd_sessions_meter_id` |

_44 columns across 22 tables._

**Tier 3 — edge cases — confirmed 2026-07-10, action: no index (revisit if a read path emerges):**

| table | column | references | notes |
|-------|--------|------------|-------|
| `members` | `busy_commissioning_id` | `grids.id` | Only ever **written** (`user-admin.service.ts` invite/update member); no query anywhere filters by it. Odd name for a member↔grid FK — looks like a "member is busy with a commissioning at this grid" marker, not a join path. **Proposed: no index** unless a read path emerges. |
| `meters` | `rls_grid_id` | `grids.id` | Formal FK, has an `_fkey` constraint, denormalized alongside `rls_organization_id` on meter assignment (`meters.service.ts`) — but **no RLS policy references it** (only `rls_organization_id` is used in `meters` policies) and no query filters by it. Write-only today. **Proposed: no index** — would be pure write-side overhead for a column with no current read consumer; revisit if a grid-scoped meter query path is added later. |

**Already covered — not new findings:**

- `accounts.organization_id` — register #25 already adds `idx_accounts_organization_id`; the gap sweep
  re-surfaced it (confirms the sweep is complete) but it's not a new item.
- `pd_sites.pd_flow_id` — FK is unindexed in the reference DB, but the column itself is dropped
  (register #14 / column adjustments §5) — moot.

#### Redundant/overlapping indexes — reviewed, no changes — confirmed 2026-07-10

`orders` has two pairs of same-column indexes, one full + one partial:

| Full index | Partial index | Verdict |
|---|---|---|
| `idx_orders_historical_grid_id` (all rows) | `idx_orders_energy_topup_grid` (`WHERE meta_order_type = 'ENERGY_TOPUP'`) | **Keep both.** Not true redundancy — the partial index is a deliberate smaller/faster index for the hot `ENERGY_TOPUP` reporting path (`find_energy_topup_revenue`, `find_top_spenders`); the full index serves all other order-type lookups by grid. |
| `idx_orders_meta_receiver_id` (all rows) | `idx_orders_energy_topup_receiver` (`WHERE meta_order_type = 'ENERGY_TOPUP'`) | **Keep both.** Same rationale — smaller partial index for the energy-topup-by-receiver hot path. |

No other overlapping/duplicate index definitions found on any keep table.

#### Observations (no index action — kept for reference, confirmed 2026-07-10)

Out of index-audit scope (RLS policy content, not structure) but surfaced while tracing predicate
columns — **not proposing changes** per the plan's non-goal ("RLS policy redesign — policies are
carried over as-is"). Maintainer confirmed 2026-07-10: keep as a documented reference (not a deviation
register entry — nothing ships/changes here, so nothing to register per the register's own rule that
every row is a deviation).

- `meter_interactions` and `wallets` each have an `"Allow org members to select"` policy with `qual =
  true` — i.e. **no org-scoping filter at all** for authenticated users on SELECT (relies on the app
  layer / other policies). Pre-existing legacy design; not changed here.
- `notifications` has **zero** RLS policies in the reference DB despite `RLS enabled` — effectively
  deny-all for the default role; app access presumably goes through the service-role key (bypasses
  RLS). Pre-existing; not changed here.

<br>

### Triggers / views — D4 — **confirmed 2026-07-10, no findings**

**Method:** enumerated every keep trigger and keep view from `002b-schema-inventory.md`, read each
definition in the reference migration (`legacy/supabase/migrations/20251028091645_remote_schema.sql`),
and checked (a) whether the `append_rls_*` design pattern is the right shape, (b) whether any other
trigger has design overhead worth flagging, (c) whether keep-view join columns are index-covered, and
(d) whether any view's query shape (subqueries, correlated lookups) is a structural concern.

#### Triggers — no new findings, everything already resolved

Every keep trigger falls into one of two groups, both already fully reviewed:

| group | triggers | resolved in |
|-------|----------|-------------|
| `append_rls_*` denormalization (`BEFORE INSERT`) | 18 triggers across `agents`, `connection_requested_meters`, `connections`, `customers`, `dcus`, `energy_cabins`, `issues`, `members`, `meter_command_batch_executions`, `meter_command_batches`, `meter_commissionings`, `meters`, `metering_hardware_install_sessions`, `mppts`, `notes`, `poles`, `routers`, `transactions`, `wallets` | Task 3c H1b — design pattern, function list, and volatility all decided there; register #23 |
| `auth.users` sync (`AFTER INSERT`/`AFTER UPDATE`) | `on_auth_user_created` → `handle_new_user()`, `on_auth_user_updated` → `handle_update_user()` | Task 3c H2 (functions kept, correctly `VOLATILE`) |

Spot-checked the `auth.users` group's design since it's outside the `append_rls_*` family flagged by the
plan: both are single-statement (`INSERT`/`UPDATE` on `public.accounts`), and `handle_update_user()`'s
`WHERE supabase_id = NEW.id` hits `accounts.supabase_id`, which already has a `UNIQUE` constraint
(`REL_13bf998d703e7d4c7b9a90f4f7`, in the D1 existing-index list) — indexed, no gap. No design overhead
to flag; nothing to change.

**No triggers outside these two groups exist among keep tables** — confirms the plan's note that
`append_rls_*` was "already resolved in 3c" was the only design-pattern trigger group, and closes D4's
trigger half with zero new findings.

#### Views — no new findings, join columns already index-covered

3 keep views (`agents_with_account`, `customers_with_account`, `meters_with_account_and_statuses`) —
the 4th, `batch_commands`, is excluded (deprecated `UNION`, register #7-adjacent).

| view | joins | index coverage |
|------|-------|-----------------|
| `agents_with_account` | `agents ⋈ accounts` on `agents.account_id = accounts.id` | `accounts.id` is the PK (auto-indexed); `agents.account_id` has `REL_df520decc9e003a843d8edd986` (unique, D1 existing-index list) |
| `customers_with_account` | `customers ⋈ accounts` on `account_id`; correlated subquery `string_agg` over `connections ⋈ meters` filtered by `conn.customer_id = c.id` | `customers.account_id` → `REL_ebcc29963874e55053e8ee80be` (unique); correlated subquery's filter column `connections.customer_id` → `idx_connection_customer_id` (both D1 existing-index list) |
| `meters_with_account_and_statuses` | 7-table join chain: `meters ⋈ connections ⋈ customers ⋈ accounts`, plus 3 `LEFT JOIN`s (`metering_hardware_install_sessions`, `metering_hardware_imports`, `meter_commissionings`) and 1 (`issues`) | every join target is either a PK (auto-indexed: `connections.id`, `customers.id`, `accounts.id`, `metering_hardware_install_sessions.id`, `metering_hardware_imports.id`, `meter_commissionings.id`, `issues.id`) or already covered by a D1-confirmed FK index (`meters.connection_id` → `idx_meter_connection_id`, existing) |

All three views' join predicates are already index-covered — by pre-existing indexes or by the D1
sweep (register #30) — so there's no index gap specific to view usage. `customers_with_account`'s
correlated subquery is a legacy design choice (could be a `LEFT JOIN` + `array_agg`/`GROUP BY` instead
of a per-row correlated subquery) but it's driven by an indexed column, and per the plan's non-goal
("view definitions carried over as-is" — no redesign scope, same posture as the D1 RLS-policy-content
observations) — **noting, not changing.**

**No index or design action for D4.** All keep triggers and views checked out clean against the
concerns the plan raised.

**Workflow:**

1. ~~Enumerate indexes on keep tables from the reference DB (new — no prior inventory).~~ **D1 signed off
   2026-07-10 — register #30** (see Indexes section above).
2. ~~Audit function volatility against Task 3c's final keep-function list.~~ **D2 signed off 2026-07-10
   — register #31.**
3. ~~Audit RLS policy invocation patterns (`pg_policies`) for the bare-vs-subquery inconsistency.~~ **D3
   signed off 2026-07-10 — register #32.**
4. ~~Review trigger design (H1b group) and keep-view definitions.~~ **D4 signed off 2026-07-10 — no
   findings, nothing to change** (see Triggers / views section above).
5. ~~Sync any resulting drop/add/change to `002b-schema-deviation-register.md` (new **Performance
   adjustments** section) with cutover implications.~~ **Done — registers #30, #31, #32 (D1–D3); D4 had
   nothing to sync.**
6. **Task 3d complete** — every batch above has a final action; register is synced.

**D1 sign-off checklist — all confirmed by maintainer 2026-07-10:**

- [x] Tier 1 (3 indexes) — RLS-predicate gaps, direct analog of register #25 — **add, register #30**
- [x] Tier 2 (44 indexes across 22 tables) — plain FK-column hygiene — **add, register #30**
- [x] Tier 3 edge cases (2 columns) — **no index** (default recommendation confirmed)
- [x] Naming convention `idx_<table>_<column>` for all new indexes (matches existing convention) — confirmed
- [x] Redundant-index review (orders partial/full pairs) — **keep both, no change** — confirmed
- [x] Observations (RLS `qual = true` on `meter_interactions`/`wallets`; zero policies on
      `notifications`) — **kept as documented reference only**; not a register entry (no schema
      change), not a separate follow-up right now
- [x] 2 already-registered index renames (#16) and 3 already-registered index removals (via column
      drops #1/#7/#12) — no new action needed, listed for completeness

**D1 complete.** Register #30 added to `002b-schema-deviation-register.md` **Performance adjustments**
section (47 new indexes: 3 Tier 1 + 44 Tier 2).
