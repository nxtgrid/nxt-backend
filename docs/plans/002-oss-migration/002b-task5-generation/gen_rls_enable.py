import json, re
from registry import DROP_TABLES, RENAME_TABLES
from pathlib import Path

BASE = Path(__file__).parent

blocks = json.load(open(BASE / "blocks.json"))
rs = [b for b in blocks if b["type"] == "ROW SECURITY"]

out = []
for b in rs:
    t = b["name"]
    if t in DROP_TABLES:
        continue
    text = b["body"].strip()
    for old, new in RENAME_TABLES.items():
        text = re.sub(rf"\bpublic\.{old}\b", f"public.{new}", text)
    out.append(text)

with open(BASE / "sections" / "14-rls-enable-body.sql", "w") as f:
    f.write("\n".join(out) + "\n")

print("ROW SECURITY statements emitted:", len(out))
