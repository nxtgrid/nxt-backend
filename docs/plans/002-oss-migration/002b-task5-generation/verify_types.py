import json, re
from registry import DROP_ENUMS, EXTERNAL_SYSTEM_ENUM_DROP_VALUES, NOTIFICATION_TYPE_ENUM_DROP_VALUES
from pathlib import Path

BASE = Path(__file__).parent

blocks = json.load(open(BASE / "blocks.json"))
enums = [b for b in blocks if b["type"] == "TYPE"]

kept_enums = {}
for b in enums:
    name = b["name"]
    if name in DROP_ENUMS:
        continue
    m = re.search(r"CREATE TYPE public\.\w+ AS ENUM \(\n(.*?)\n\);", b["body"], re.S)
    values = [v.strip().strip("'").strip(",").strip("'") for v in m.group(1).split("\n")]
    values = [v.strip().strip("'") for v in m.group(1).split(",\n")]
    values = [v.strip().lstrip("'").rstrip("'").strip() for v in values]
    kept_enums[name] = values

# Apply trims
kept_enums["external_system_enum"] = [v for v in kept_enums["external_system_enum"] if v not in EXTERNAL_SYSTEM_ENUM_DROP_VALUES]
kept_enums["notification_type_enum"] = [v for v in kept_enums["notification_type_enum"] if v not in NOTIFICATION_TYPE_ENUM_DROP_VALUES]
kept_enums["organization_type_enum"].append("PLATFORM_OPERATOR")

# Now parse my authored file and compare
authored_text = open(BASE / "sections" / "02-types.sql").read()
authored_blocks = re.findall(r"CREATE TYPE public\.(\w+) AS ENUM \(\n(.*?)\n\);", authored_text, re.S)
authored = {}
for name, body in authored_blocks:
    values = [v.strip().lstrip("'").rstrip("'").strip().rstrip(",").strip("'") for v in body.split(",\n")]
    authored[name] = values

print("Enum count expected (kept):", len(kept_enums))
print("Enum count authored:", len(authored))
print("Missing from authored:", set(kept_enums) - set(authored))
print("Extra in authored:", set(authored) - set(kept_enums))
mismatches = 0
for name in kept_enums:
    if name in authored and kept_enums[name] != authored[name]:
        mismatches += 1
        print(f"MISMATCH {name}: expected={kept_enums[name]} authored={authored[name]}")
print("Total mismatches:", mismatches)
