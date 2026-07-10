#!/usr/bin/env python3
"""Assemble the final init migration from the authored section files, in
dependency order (per the Task 5 plan: extensions -> types -> tables ->
constraints -> functions -> triggers -> policies -> grants, with sequences/
views/indexes interspersed where FK/dependency order requires).

Re-running this writes over the original 2026-07-10 init migration file. If
re-generating for a *new* migration (not just reproducing/verifying the
original), change OUT_PATH's filename to a fresh timestamp first — Supabase
requires migration filenames to sort after any already-applied migration.
"""
from pathlib import Path

BASE = Path(__file__).parent
REPO_ROOT = BASE.parents[3]

def read(path):
    with open(BASE / "sections" / path) as f:
        return f.read().rstrip("\n")

def section(title, body_text, note=None):
    lines = [
        "-- =============================================================================",
        f"-- {title}",
        "-- =============================================================================",
    ]
    if note:
        lines.append(note)
    lines.append("")
    lines.append(body_text)
    return "\n".join(lines)

parts = []

# 1. Extensions (already carries the whole-file preamble + its own header)
parts.append(read("01-extensions.sql"))

# 2. Enum types (already has its own header)
parts.append(read("02-types.sql"))

# 3. Tables
parts.append(section(
    "Tables",
    read("04-tables-body.sql"),
    "-- 35 of the legacy chain's 57 tables are kept, carried over verbatim except\n"
    "-- for the column drops/renames and table renames recorded in the deviation\n"
    "-- register's \"Column adjustments\" section and register #16.",
))

# 4. Sequences
parts.append(section(
    "Sequences",
    read("05-sequences-body.sql"),
    "-- One sequence (or identity-column sequence) per kept table's primary key.\n"
    "-- 3 tables (meter_interactions, pd_sites, pd_site_submissions) use identity\n"
    "-- columns rather than a standalone sequence + DEFAULT nextval(); pg_dump\n"
    "-- renders both forms, kept as dumped.",
))

# 5. Views
parts.append(section(
    "Views",
    read("09-views-body.sql"),
    "-- 3 of the legacy chain's 4 views are kept (agents_with_account,\n"
    "-- customers_with_account, meters_with_account_and_statuses), with the same\n"
    "-- column drops applied as their underlying tables. batch_commands is dropped\n"
    "-- (register #9 — read path for the dropped directive-batch tables).",
))

# 6. Constraints (PK/UNIQUE, then FK)
constraints_body = read("06-constraints-body.sql") + "\n\n" + read("07-fk-constraints-body.sql")
parts.append(section(
    "Constraints",
    constraints_body,
    "-- Primary key and unique constraints first, then foreign keys.\n"
    "-- FK cycle hardening (register #34): 5 denormalized \"latest pointer\" FKs get\n"
    "-- ON DELETE SET NULL so a referenced row's deletion doesn't require deleting\n"
    "-- the pointer's owner; their 5 structural back-pointer counterparts are left\n"
    "-- at the implicit NO ACTION default (deleting the pointed-to row must fail,\n"
    "-- or cascade through the owning aggregate root, unless the pointer is\n"
    "-- cleared first).",
))

# 7. Indexes
indexes_body = read("08-indexes-body.sql") + "\n\n" + read("08b-new-indexes.sql")
parts.append(section(
    "Indexes",
    indexes_body,
    "-- Existing kept indexes (renamed where their table was renamed), followed by\n"
    "-- 48 new indexes closing FK/RLS-predicate coverage gaps found during the\n"
    "-- schema audit (register #25, #30) — not present in the legacy reference DB.",
))

# 8. Functions (already has its own header)
parts.append(read("10-functions-body.sql"))

# 9. Triggers
parts.append(section(
    "Triggers",
    read("11-triggers-body.sql"),
    "-- 22 triggers: 19 append_rls_organization_id_* triggers backing denormalized\n"
    "-- RLS columns (3 renamed alongside their table, register #16), the 2\n"
    "-- auth.users triggers carried over from the legacy chain unchanged, and 1 new\n"
    "-- trigger syncing the admin-organization GUC on organizations changes\n"
    "-- (register #22).",
))

# 10. Row-level security: enable, then policies
rls_body = read("14-rls-enable-body.sql") + "\n\n" + read("13-policies-body.sql")
parts.append(section(
    "Row-level security",
    rls_body,
    "-- RLS is enabled on all 35 kept tables (unchanged from the legacy chain).\n"
    "-- 76 of the legacy chain's 123 policies are kept — 26 dropped with their\n"
    "-- table, 21 dropped for targeting company-infra readonly roles\n"
    "-- (grafana_readonly, make_readonly, snaplet_readonly_2) that this baseline\n"
    "-- does not provision. 18 policies are rewritten to wrap their RLS helper\n"
    "-- call in `( SELECT … )` for per-statement (not per-row) evaluation (register\n"
    "-- #32) — the other 51 helper-calling policies were already wrapped upstream.",
))

# 11. Grants
parts.append(section(
    "Grants (Data API access)",
    read("12-grants-body.sql"),
    "-- Explicit per-object GRANTs for every kept table, sequence, and function, to\n"
    "-- anon/authenticated/service_role (register #33) — required for Data API\n"
    "-- (PostgREST/GraphQL) reachability; Supabase stopped auto-granting these on\n"
    "-- new projects from 2026-05-30. The corresponding 3 ALTER DEFAULT PRIVILEGES\n"
    "-- statements are deliberately omitted: future tables get explicit grants per\n"
    "-- migration instead of an ambient auto-expose default.",
))

final = "\n\n".join(parts) + "\n"

OUT_PATH = REPO_ROOT / "supabase" / "migrations" / "20260710120000_init.sql"
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with open(OUT_PATH, "w") as f:
    f.write(final)

print("Written:", OUT_PATH)
print("Total lines:", final.count("\n"))
