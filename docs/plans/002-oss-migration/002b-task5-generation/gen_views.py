import json, re
from registry import DROP_VIEWS, VIEW_COLUMN_CHANGES
from pathlib import Path

BASE = Path(__file__).parent

blocks = json.load(open(BASE / "blocks.json"))
view_blocks = [b for b in blocks if b["type"] == "VIEW"]

def strip_owner(body):
    lines = [l for l in body.split("\n") if not re.match(r"^ALTER VIEW .* OWNER TO ", l)]
    return "\n".join(lines).strip("\n")

out = []
for b in view_blocks:
    if b["name"] in DROP_VIEWS:
        continue
    body = strip_owner(b["body"])
    drop_cols = VIEW_COLUMN_CHANGES.get(b["name"], {}).get("drop", [])
    for col in drop_cols:
        lines = body.split("\n")
        new_lines = [l for l in lines if l.strip() != f"m.{col}," and l.strip() != f"m.{col}"]
        removed = len(lines) - len(new_lines)
        if removed == 0:
            print(f"WARNING: column {col} not found as a selected line in view {b['name']}")
        body = "\n".join(new_lines)
    out.append(body.strip())

with open(BASE / "sections" / "09-views-body.sql", "w") as f:
    f.write("\n\n".join(out) + "\n")
print("Kept views:", len(out))
