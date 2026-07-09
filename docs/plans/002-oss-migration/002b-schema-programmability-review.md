# Schema Programmability Review (working review)

**Companion to:** `002b-database-baseline.md` — **Task 3c**
**Status:** Not started — generate after Task 3b (column review) is complete.

## Purpose

In-depth maintainer review of **keep** schema objects that are not table columns: **enum values**,
**functions**, and **triggers** destined for the OSS init migration. Object-level bucket decisions
live in `002b-schema-inventory.md` (Task 3a); this pass confirms value-level trims, renames,
orphans, and architectural fit before Task 5.

| object kind | row grain | actions |
|-------------|-----------|---------|
| enum | one row per **value** on each keep enum | `keep` \| `drop` |
| function | one row per keep function | `keep` \| `drop` \| `rename` |
| trigger | one row per keep trigger | `keep` \| `drop` \| `rename` |

**Register:** each **drop**, **rename**, or enum **value drop** must land in
`002b-schema-deviation-register.md` (new **Programmability adjustments** section or register entry)
before Task 3 is complete.

## Scope (from inventory — keep bucket)

| kind | count (approx.) | notes |
|------|----------------:|-------|
| enum | 28 types | includes deferred **enum value trim** from Task 3a (F3, F5) |
| function | 22 | incl. auth `handle_new_user` / `handle_update_user`, RLS helpers, RPCs |
| trigger | 22 public + 2 auth | incl. register #10 / #16 renames already decided at object level |

**Out of scope:** excluded/dropped/parameterize objects (already decided in Task 3a); table columns
(Task 3b / `002b-schema-column-adjustments.md`).

## Review backlog (seed — confirm or clear in 3c)

> High-attention items flagged during 3a / open follow-ups. Not decisions yet.

| object | kind | why flagged |
|--------|------|-------------|
| `rls_check_if_nxt_member()` | function | Hard-coded NXT Grid org semantics in RLS; may need broader auth/architecture discussion (ADR-004 / multi-tenant adopters) |
| `rls_check_if_lender()` | function | Lender role coupling — confirm OSS baseline still needs it |
| `rls_get_member_org_id()` | function | Core RLS helper — verify behaviour vs Supabase Auth claims |
| `append_rls_organization_id_by_historical_grid_id()` | function | **Orphan** — no trigger in migration chain |
| `external_system_enum` | enum | Value trim deferred; used widely (notifications, DCUs, orders meta, …) |
| `notification_type_enum` | enum | Value trim deferred; company-specific notification kinds |
| `gender_enum`, `generator_type_enum`, `id_document_type_enum` | enum | Value trim deferred (F3) |
| `member_type_enum` | enum | SUPERADMIN / partner semantics — adopter relevance |
| `communication_protocol_enum` | enum | CALIN_LORAWAN vs OSS meter brands |

Suggested review batches (maintainer):

1. **H1 — RLS helpers** — `rls_*`, `append_rls_*` (incl. orphan + register #16 renames)
2. **H2 — Auth + platform RPCs** — `handle_new_user`, `handle_update_user`, `get_grid_status`
3. **H3 — Payments RPCs** — `lock_next_order_and_wallets`, `find_*`
4. **H4 — Enum value trim** — by capability (platform → metering → payments → notifications → field ops → production monitoring)
5. **H5 — Triggers** — verify each keep trigger still matches a keep function + table

## Register

### Enum values

| enum | value | action | register § | rationale | notes |
|------|-------|--------|------------|-----------|-------|
| _(pending Task 3c)_ | | | | | |

### Functions

| function | action | register § | rationale | notes |
|----------|--------|------------|-----------|-------|
| _(pending Task 3c)_ | | | | |

### Triggers

| trigger | on table | action | register § | rationale | notes |
|---------|----------|--------|------------|-----------|-------|
| _(pending Task 3c)_ | | | | | |

**Workflow:**

1. Generate enum-value / function / trigger rows from reference DB + inventory keep list.
2. Pre-fill known renames from deviation register (#10, #16).
3. Maintainer reviews in batches H1–H5; edit actions here.
4. On sign-off: sync confirmed changes to deviation register; Task 3 complete.
