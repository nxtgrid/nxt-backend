import json, re
from registry import DROP_TABLES, RENAME_TABLES, RENAME_SEQUENCES, rename_table
from pathlib import Path

BASE = Path(__file__).parent

blocks = json.load(open(BASE / "blocks.json"))

def strip_owner(body):
    lines = [l for l in body.split("\n") if not re.match(r"^ALTER (TABLE|SEQUENCE) .* OWNER TO ", l)]
    return "\n".join(lines).strip("\n")

def apply_renames(text):
    for old, new in RENAME_TABLES.items():
        text = re.sub(rf"\bpublic\.{old}\b", f"public.{new}", text)
    for old, new in RENAME_SEQUENCES.items():
        text = re.sub(rf"\bpublic\.{old}\b", f"public.{new}", text)
        text = re.sub(rf"\b{old}\b", new, text)  # bare mentions inside SEQUENCE NAME clauses etc.
    return text

seq_blocks = {b["name"]: b for b in blocks if b["type"] == "SEQUENCE"}
default_blocks = [b for b in blocks if b["type"] == "DEFAULT"]
owned_blocks = {b["name"]: b for b in blocks if b["type"] == "SEQUENCE OWNED BY"}
table_names_kept_original_order = [b["name"] for b in blocks if b["type"] == "TABLE" and b["name"] not in DROP_TABLES]

out = []
for tname in table_names_kept_original_order:
    seq_name = f"{tname}_id_seq"
    seq_block = seq_blocks.get(seq_name)
    if seq_block is None:
        continue  # shouldn't happen for our 35 keep tables (all have an id seq, plain or identity)
    body = strip_owner(seq_block["body"])
    body = apply_renames(body)
    out.append(body.strip())
    default_block = None
    for d in default_blocks:
        if d["name"] == f"{tname} id":
            default_block = d
            break
    if default_block is not None:
        dbody = apply_renames(strip_owner(default_block["body"]))
        out.append(dbody.strip())
    owned_block = owned_blocks.get(seq_name)
    if owned_block is not None:
        obody = apply_renames(strip_owner(owned_block["body"]))
        out.append(obody.strip())

with open(BASE / "sections" / "05-sequences-body.sql", "w") as f:
    f.write("\n\n".join(out) + "\n")

print("Sequence-bearing kept tables:", len(table_names_kept_original_order))
print("Wrote 05-sequences-body.sql")
