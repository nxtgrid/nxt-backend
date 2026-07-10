import json, re
from registry import DROP_TABLES, RENAME_TABLES, COLUMN_CHANGES, rename_table
from pathlib import Path

BASE = Path(__file__).parent

blocks = json.load(open(BASE / "blocks.json"))
index_blocks = [b for b in blocks if b["type"] == "INDEX"]

def apply_table_renames(text):
    for old, new in RENAME_TABLES.items():
        text = re.sub(rf"\bpublic\.{old}\b", f"public.{new}", text)
    return text

kept = []
dropped_table_reason = 0
dropped_col_reason = 0
for b in index_blocks:
    m = re.search(r"ON public\.(\w+)", b["body"])
    orig_table = m.group(1)
    if orig_table in DROP_TABLES:
        dropped_table_reason += 1
        continue
    new_table = rename_table(orig_table)
    dropped_cols = set(COLUMN_CHANGES.get(new_table, {}).get("drop", []))
    # extract column list inside USING btree (...)
    cm = re.search(r"USING \w+ \(([^)]+)\)", b["body"])
    cols_raw = cm.group(1) if cm else ""
    # columns may include expressions; take simple identifiers only for the drop check
    simple_cols = set(re.findall(r"\b\w+\b", cols_raw))
    if simple_cols & dropped_cols:
        dropped_col_reason += 1
        print("DROPPED FOR COLUMN:", b["name"], b["body"].strip())
        continue
    name = b["name"]
    body = apply_table_renames(b["body"])
    if orig_table in RENAME_TABLES:
        new_name = name.replace(orig_table, new_table)
        body = re.sub(rf"\b{re.escape(name)}\b", new_name, body)
        name = new_name
    kept.append(body.strip())

with open(BASE / "sections" / "08-indexes-body.sql", "w") as f:
    f.write("\n\n".join(kept) + "\n")

print("Kept indexes:", len(kept), "of", len(index_blocks))
print("Dropped (table reason):", dropped_table_reason)
print("Dropped (column reason):", dropped_col_reason)
