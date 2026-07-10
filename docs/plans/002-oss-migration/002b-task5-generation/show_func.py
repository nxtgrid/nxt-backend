import json, sys
from pathlib import Path

BASE = Path(__file__).parent
blocks = json.load(open(BASE / "blocks.json"))
names = sys.argv[1:]
for b in blocks:
    if b["type"] == "FUNCTION" and (not names or b["name"] in names):
        print(f"===== {b['name']} =====")
        print(b["body"])
        print()
