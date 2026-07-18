#!/usr/bin/env python3
"""Parse the pg_dump schema-only output into named blocks, keyed by
(type, schema, name) as pg_dump's own '-- Name: X; Type: Y; Schema: Z; Owner: W'
comment headers describe them. This lets Task 5 authoring operate on exact
dump text (no retyping) and only apply targeted edits.
"""
import re
import sys
import json
from pathlib import Path

BASE = Path(__file__).parent

with open(BASE / "schema-reference.sql") as f:
    text = f.read()

# Header pattern used throughout pg_dump output.
header_re = re.compile(
    r"^--\n-- Name: (?P<name>.*?); Type: (?P<type>.*?); Schema: (?P<schema>.*?); Owner: (?P<owner>.*?)\n--\n",
    re.MULTILINE,
)

matches = list(header_re.finditer(text))
blocks = []
for i, m in enumerate(matches):
    start = m.end()
    end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
    body = text[start:end].rstrip("\n")
    blocks.append({
        "name": m.group("name"),
        "type": m.group("type"),
        "schema": m.group("schema"),
        "owner": m.group("owner"),
        "body": body,
    })

print(f"Total blocks: {len(blocks)}", file=sys.stderr)

with open(BASE / "blocks.json", "w") as f:
    json.dump(blocks, f, indent=1)

# Sanity: also capture the preamble (before first header) for inspection.
preamble = text[: matches[0].start()] if matches else text
with open(BASE / "sections" / "preamble.sql", "w") as f:
    f.write(preamble)

# Summary by type
from collections import Counter
c = Counter(b["type"] for b in blocks)
for t, n in sorted(c.items()):
    print(f"{t}: {n}", file=sys.stderr)
