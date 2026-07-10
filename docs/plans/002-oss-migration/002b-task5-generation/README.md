# Task 5 generation pipeline

This folder is the working pipeline used to author
`supabase/migrations/20260710120000_init.sql` — the canonical OSS baseline
init migration — from the legacy database's schema. It is **not** run as
part of any build, CI, or app code path; it exists purely so Task 5 doesn't
have to be redone by hand if it ever needs to be re-run (e.g. a Task 6 A/B
diff turns up a discrepancy that's cheaper to fix by regenerating than by
hand-editing 3,000+ lines of SQL, or the legacy schema changes before
cutover).

**Source of truth for *why*:** every keep/drop/rename/modify decision this
pipeline encodes comes from
`docs/plans/002-oss-migration/002b-schema-deviation-register.md`. This
pipeline is only the *how* — it turns those decisions into SQL text
mechanically, so the final migration is provably consistent with the
register instead of hand-transcribed.

## How it works

1. `schema-reference.sql` — a `pg_dump --schema-only` of the legacy
   reference database (owned schemas). This is the one true input; every
   other file here is derived from it.
2. `parse_dump.py` — parses the dump into structured blocks (keyed by
   `pg_dump`'s own `-- Name: X; Type: Y; Schema: Z; Owner: W` comment
   headers) and writes `blocks.json` (gitignored-equivalent — not checked
   in, since it's fully regenerable from `schema-reference.sql` in under a
   second) and `sections/preamble.sql`.
3. `registry.py` — the single source of truth for keep/drop/rename/modify
   decisions, transcribed from the deviation register. Every `gen_*.py`
   script imports from here; there is no other place transformation logic
   lives.
4. `gen_tables.py`, `gen_sequences.py`, `gen_constraints.py`,
   `gen_indexes.py`, `gen_views.py`, `gen_triggers.py`, `gen_policies.py`,
   `gen_grants.py`, `gen_rls_enable.py` — each reads `blocks.json` +
   `registry.py` and writes one section's SQL body to `sections/`. Some
   sections (extensions, enum types, functions, and the 48 new
   register-#25/#30 indexes) were hand-authored rather than mechanically
   derived — see `sections/01-extensions.sql`, `02-types.sql`,
   `10-functions-body.sql`, `08b-new-indexes.sql` directly.
5. `verify_types.py` — sanity-checks the hand-authored enum types section
   against `registry.py`'s decisions.
6. `assemble.py` — concatenates every section (hand-authored + generated) in
   dependency order (extensions → types → tables → sequences → views →
   constraints → indexes → functions → triggers → RLS/policies → grants)
   with section-header comments, and writes the final migration file.
7. `show_table.py` / `show_func.py` — small ad hoc lookup helpers used
   during authoring/debugging to print one block's exact dump text (e.g.
   `python3 show_table.py meters`). Not part of the generation path.

## Re-running the full pipeline

From this directory:

```bash
python3 parse_dump.py
python3 gen_tables.py
python3 gen_sequences.py
python3 gen_constraints.py
python3 gen_indexes.py
python3 gen_views.py
python3 gen_triggers.py
python3 gen_policies.py
python3 gen_grants.py
python3 gen_rls_enable.py
python3 verify_types.py   # sanity check only, no output file
python3 assemble.py
```

`assemble.py` writes to `supabase/migrations/20260710120000_init.sql`
(computed relative to the repo root, so this works regardless of cwd).
Verified byte-for-byte reproducible against the original 2026-07-10
migration as of the last time this pipeline was moved/refactored.

**If you're regenerating because the decisions changed** (not just
verifying reproducibility): update `registry.py` and/or the relevant
hand-authored `sections/*.sql` file first, keep the deviation register in
sync, then re-run. If the result is a genuinely new migration (not a
same-day fix to the unapplied original), give it a fresh timestamp filename
in `assemble.py` — Supabase requires migration filenames to sort after any
already-applied migration.

## Regenerating `schema-reference.sql` itself

If the legacy reference database's schema has changed and you need a fresh
dump:

```bash
cd legacy && npx supabase@2.109.1 start
pg_dump --schema-only --schema=public \
  "postgres://postgres:postgres@127.0.0.1:54322/postgres" \
  > ../docs/plans/002-oss-migration/002b-task5-generation/schema-reference.sql
npx supabase@2.109.1 stop
```

(Adjust the connection string/port to whatever `supabase start` reports for
your local stack. The dump is `public`-schema-only — the `auth` schema is
never dumped. The 2 `auth.users` triggers are hand-appended directly in
`gen_triggers.py`; their trigger functions (`handle_new_user`,
`handle_update_user`) are hand-authored in `sections/10-functions-body.sql`.
Both are carried over unchanged from the legacy migration chain, not
derived from this dump.)
