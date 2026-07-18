import json, re
from pathlib import Path
from registry import (
    DROP_TABLES, RENAME_TABLES, COLUMN_CHANGES, table_kept, rename_table,
)

BASE = Path(__file__).parent

blocks = json.load(open(BASE / "blocks.json"))
tables = [b for b in blocks if b["type"] == "TABLE"]

# Capability grouping for section comments (matches the plan's own batch structure)
CAPABILITY = {
    "accounts": "Platform core", "agents": "Platform core", "api_keys": "Platform core",
    "grids": "Platform core", "organizations": "Platform core", "members": "Platform core",
    "poles": "Platform core", "routers": "Platform core", "dcus": "Platform core",
    "energy_cabins": "Production monitoring", "mppts": "Production monitoring", "solcast_cache": "Production monitoring",
    "customers": "Metering", "connections": "Metering", "connection_requested_meters": "Metering",
    "meters": "Metering", "meter_interactions": "Metering", "meter_commissionings": "Metering",
    "metering_hardware_imports": "Metering", "metering_hardware_install_sessions": "Metering",
    "meter_command_batches": "Metering", "meter_command_batch_executions": "Metering",
    "ussd_sessions": "Metering", "ussd_session_hops": "Metering",
    "banks": "Payments", "wallets": "Payments", "transactions": "Payments", "orders": "Payments",
    "notifications": "Notifications", "notification_parameters": "Notifications",
    "issues": "Field ops", "notes": "Field ops", "audits": "Field ops",
    "pd_sites": "Field ops", "pd_site_submissions": "Field ops",
}

def parse_columns(body):
    start = body.index("(")
    end = body.rindex(");")
    inner = body[start + 1:end]
    lines = [l for l in inner.strip("\n").split("\n")]
    cols = []
    for l in lines:
        has_comma = l.rstrip().endswith(",")
        stripped = l.rstrip()
        if has_comma:
            stripped = stripped[:-1]
        # leading whitespace + column name is first token
        m = re.match(r"^(\s*)(\S+)(.*)$", stripped)
        indent, colname, rest = m.group(1), m.group(2), m.group(3)
        cols.append({"raw": l, "name": colname, "indent": indent, "rest": rest, "has_comma": has_comma})
    return cols


def rebuild(table_name, cols):
    lines = []
    for i, c in enumerate(cols):
        suffix = "," if i < len(cols) - 1 else ""
        lines.append(f"{c['indent']}{c['name']}{c['rest']}{suffix}")
    body = "\n".join(lines)
    return f"CREATE TABLE public.{table_name} (\n{body}\n);"


out_sections = {}
order = []
for b in tables:
    name = b["name"]
    if name in DROP_TABLES:
        continue
    cols = parse_columns(b["body"])
    new_name = rename_table(name)
    changes = COLUMN_CHANGES.get(new_name, {"drop": [], "rename": {}})
    drop_set = set(changes["drop"])
    rename_map = changes["rename"]
    new_cols = []
    for c in cols:
        if c["name"] in drop_set:
            continue
        if c["name"] in rename_map:
            c["name"] = rename_map[c["name"]]
        new_cols.append(c)
    stmt = rebuild(new_name, new_cols)
    out_sections[new_name] = stmt
    order.append(new_name)

# Verify column counts against expectation
total_kept_cols = sum(len(parse_columns(b["body"])) - len(COLUMN_CHANGES.get(rename_table(b["name"]), {"drop": []}).get("drop", [])) for b in tables if b["name"] not in DROP_TABLES)
print("Kept tables:", len(order))
print("Total kept columns (tables only):", total_kept_cols)

with open(BASE / "sections" / "04-tables-body.sql", "w") as f:
    for name in order:
        f.write(out_sections[name])
        f.write("\n\n")

print("Wrote 04-tables-body.sql")
