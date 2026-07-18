import json, re
from registry import DROP_TABLES, RENAME_TABLES, COLUMN_CHANGES, rename_table
from pathlib import Path

BASE = Path(__file__).parent

blocks = json.load(open(BASE / "blocks.json"))

FK_HARDEN = {
    # (constrained_table_after_rename, constrained_column): referenced_table_after_rename
    ("meters", "last_metering_hardware_install_session_id"): "metering_hardware_install_sessions",
    ("metering_hardware_install_sessions", "last_metering_hardware_import_id"): "metering_hardware_imports",
    ("metering_hardware_install_sessions", "last_meter_commissioning_id"): "meter_commissionings",
    ("dcus", "last_metering_hardware_install_session_id"): "metering_hardware_install_sessions",
    ("meters", "last_encountered_issue_id"): "issues",
}

def table_of(block_name):
    return block_name.split(" ", 1)[0]

def dropped_cols_for(table_after_rename):
    return set(COLUMN_CHANGES.get(table_after_rename, {}).get("drop", []))

def rename_cols_for(table_after_rename):
    return COLUMN_CHANGES.get(table_after_rename, {}).get("rename", {})

def apply_table_renames(text):
    for old, new in RENAME_TABLES.items():
        text = re.sub(rf"\bpublic\.{old}\b", f"public.{new}", text)
    return text

def apply_constraint_name_renames(text):
    # Constraint names are bare identifiers auto-generated from the original
    # table name (no "public." prefix), so apply_table_renames' regex misses
    # them; rename the ADD CONSTRAINT <name> identifier itself where it still
    # starts with an old (pre-rename) table name.
    for old, new in RENAME_TABLES.items():
        text = re.sub(rf"(ADD CONSTRAINT (?:\"|)){old}_", rf"\1{new}_", text)
    return text

def apply_col_rename_in_paren(text, table_after_rename):
    rename_map = rename_cols_for(table_after_rename)
    if not rename_map:
        return text
    def repl(m):
        cols = [c.strip() for c in m.group(1).split(",")]
        cols = [rename_map.get(c, c) for c in cols]
        return "(" + ", ".join(cols) + ")"
    # only rewrite the column-list parens right after FOREIGN KEY / PRIMARY KEY / UNIQUE
    text = re.sub(r"(FOREIGN KEY|PRIMARY KEY|UNIQUE) \(([^)]+)\)", lambda m: f"{m.group(1)} (" + ", ".join(rename_map.get(c.strip(), c.strip()) for c in m.group(2).split(",")) + ")", text)
    return text

# ---------- PK/UNIQUE constraints ----------
constraint_blocks = [b for b in blocks if b["type"] == "CONSTRAINT"]
kept_constraints = []
for b in constraint_blocks:
    orig_table = table_of(b["name"])
    if orig_table in DROP_TABLES:
        continue
    new_table = rename_table(orig_table)
    dropped = dropped_cols_for(new_table)
    m = re.search(r"(PRIMARY KEY|UNIQUE) \(([^)]+)\)", b["body"])
    cols = [c.strip() for c in m.group(2).split(",")] if m else []
    if any(c in dropped for c in cols):
        continue
    body = apply_table_renames(b["body"])
    body = apply_constraint_name_renames(body)
    body = apply_col_rename_in_paren(body, new_table)
    kept_constraints.append(body.strip())

with open(BASE / "sections" / "06-constraints-body.sql", "w") as f:
    f.write("\n\n".join(kept_constraints) + "\n")
print("Kept PK/UNIQUE constraints:", len(kept_constraints), "of", len(constraint_blocks))

# ---------- FK constraints ----------
fk_blocks = [b for b in blocks if b["type"] == "FK CONSTRAINT"]
kept_fks = []
dropped_for_table_reason = 0
dropped_for_column_reason = 0
for b in fk_blocks:
    orig_table = table_of(b["name"])
    if orig_table in DROP_TABLES:
        dropped_for_table_reason += 1
        continue
    new_table = rename_table(orig_table)
    m = re.search(r"FOREIGN KEY \(([^)]+)\) REFERENCES public\.(\w+)\(", b["body"])
    if m is None:
        # FK to a non-public schema (e.g. accounts.supabase_id -> auth.users) — always kept
        cols = []
        ref_table_orig = None
    else:
        cols = [c.strip() for c in m.group(1).split(",")]
        ref_table_orig = m.group(2)
    if ref_table_orig is not None and ref_table_orig in DROP_TABLES:
        dropped_for_table_reason += 1
        continue
    dropped = dropped_cols_for(new_table)
    if any(c in dropped for c in cols):
        dropped_for_column_reason += 1
        continue
    body = apply_table_renames(b["body"])
    body = apply_constraint_name_renames(body)
    body = apply_col_rename_in_paren(body, new_table)
    # FK hardening: add ON DELETE SET NULL for the 5 forward pointers
    ref_table_new = rename_table(ref_table_orig) if ref_table_orig is not None else None
    rename_map = rename_cols_for(new_table)
    renamed_cols = [rename_map.get(c, c) for c in cols]
    if len(renamed_cols) == 1 and (new_table, renamed_cols[0]) in FK_HARDEN and FK_HARDEN[(new_table, renamed_cols[0])] == ref_table_new:
        body = body.rstrip()
        assert body.endswith(");")
        body = body[:-1] + " ON DELETE SET NULL;"
    kept_fks.append(body.strip())

with open(BASE / "sections" / "07-fk-constraints-body.sql", "w") as f:
    f.write("\n\n".join(kept_fks) + "\n")
print("Kept FK constraints:", len(kept_fks), "of", len(fk_blocks))
print("  dropped (table reason):", dropped_for_table_reason)
print("  dropped (column reason):", dropped_for_column_reason)
