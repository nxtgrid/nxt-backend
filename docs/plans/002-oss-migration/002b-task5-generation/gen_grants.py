import json, re
from pathlib import Path
from registry import (
    DROP_TABLES, RENAME_TABLES, DROP_SEQUENCES, RENAME_SEQUENCES,
    DROP_FUNCTIONS, RENAME_FUNCTIONS, PARAMETERIZE_ROLES, rename_table,
    DROP_VIEWS,
)

BASE = Path(__file__).parent

blocks = json.load(open(BASE / "blocks.json"))
acl_blocks = [b for b in blocks if b["type"] == "ACL"]

def filter_readonly_lines(body):
    lines = [l for l in body.split("\n") if l.strip()]
    kept = [l for l in lines if not any(f"TO {role};" in l for role in PARAMETERIZE_ROLES)]
    return kept

def apply_table_renames(text):
    for old, new in RENAME_TABLES.items():
        text = re.sub(rf"\bpublic\.{old}\b", f"public.{new}", text)
    return text

def apply_seq_renames(text):
    for old, new in RENAME_SEQUENCES.items():
        text = re.sub(rf"\bpublic\.{old}\b", f"public.{new}", text)
    return text

def apply_func_renames(text):
    for old, new in RENAME_FUNCTIONS.items():
        text = re.sub(rf"\bpublic\.{old}\(\)", f"public.{new}()", text)
    return text

out = []

# --- SCHEMA ---
for b in acl_blocks:
    if b["name"] == "SCHEMA public":
        out.append("\n".join(filter_readonly_lines(b["body"])))

# --- TABLE ---
for b in acl_blocks:
    if not b["name"].startswith("TABLE "):
        continue
    orig_table = b["name"][len("TABLE "):]
    if orig_table in DROP_TABLES or orig_table in DROP_VIEWS:
        continue
    lines = filter_readonly_lines(b["body"])
    text = apply_table_renames("\n".join(lines))
    out.append(text)

# --- SEQUENCE ---
for b in acl_blocks:
    if not b["name"].startswith("SEQUENCE "):
        continue
    orig_seq = b["name"][len("SEQUENCE "):]
    if orig_seq in DROP_SEQUENCES:
        continue
    lines = filter_readonly_lines(b["body"])
    text = apply_table_renames(apply_seq_renames("\n".join(lines)))
    out.append(text)

# --- FUNCTION ---
for b in acl_blocks:
    if not b["name"].startswith("FUNCTION "):
        continue
    m = re.match(r"FUNCTION (\w+)\(", b["name"])
    orig_fn = m.group(1)
    if orig_fn in DROP_FUNCTIONS:
        continue
    lines = filter_readonly_lines(b["body"])
    text = apply_func_renames("\n".join(lines))
    out.append(text)

# --- New functions not present in the legacy dump (register #23, #22) ---
NEW_FUNCTIONS = [
    "rls_org_id_from_grid(integer)",
    "rls_org_id_from_customer(integer)",
    "rls_org_id_from_connection(integer)",
    "rls_org_id_from_agent(integer)",
    "rls_org_id_from_meter(integer)",
    "rls_org_id_from_dcu(integer)",
]
for fn in NEW_FUNCTIONS:
    lines = [f'GRANT ALL ON FUNCTION public.{fn} TO {role};' for role in ("anon", "authenticated", "service_role")]
    out.append("\n".join(lines))

with open(BASE / "sections" / "12-grants-body.sql", "w") as f:
    f.write("\n\n".join(out) + "\n")

print("Grant blocks emitted:", len(out))
