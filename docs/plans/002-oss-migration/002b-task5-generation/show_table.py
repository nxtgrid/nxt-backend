import json, sys
from pathlib import Path

BASE = Path(__file__).parent
blocks = json.load(open(BASE / "blocks.json"))
name = sys.argv[1] if len(sys.argv) > 1 else "meters"
for b in blocks:
    if b["type"] == "TABLE" and b["name"] == name:
        print(b["body"])
        break
