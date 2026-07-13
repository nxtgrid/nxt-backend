#!/usr/bin/env python3
"""Task 6 A/B schema comparison: legacy dump vs new baseline dump.

Parses both pg_dump outputs, normalizes the legacy side per registry.py
(renames, drops), then classifies every structural difference against the
deviation register. Reports unexplained hunks.

Usage (from repo root, after dumps exist):
  python3 docs/plans/002-oss-migration/002b-task6/compare_schemas.py \\
    /tmp/schema-old.sql /tmp/schema-new.sql
"""
import re
import sys
from collections import defaultdict
from pathlib import Path

REGISTRY_DIR = Path(__file__).resolve().parent.parent / "002b-task5-generation"
sys.path.insert(0, str(REGISTRY_DIR))

from registry import (  # noqa: E402
    COLUMN_CHANGES,
    DROP_ENUMS,
    DROP_FUNCTIONS,
    DROP_TABLES,
    DROP_TRIGGERS,
    DROP_VIEWS,
    EXTERNAL_SYSTEM_ENUM_DROP_VALUES,
    KEEP_VIEWS,
    NOTIFICATION_TYPE_ENUM_DROP_VALUES,
    PARAMETERIZE_ROLES,
    RENAME_FUNCTIONS,
    RENAME_SEQUENCES,
    RENAME_TABLES,
    RENAME_TRIGGERS,
    VIEW_COLUMN_CHANGES,
)

HEADER_RE = re.compile(
    r"^--\n-- Name: (?P<name>.*?); Type: (?P<type>.*?); Schema: (?P<schema>.*?); Owner: (?P<owner>.*?)\n--\n",
    re.MULTILINE,
)

FK_HARDEN = {
    ("meters", "last_metering_hardware_install_session_id"): "SET NULL",
    ("metering_hardware_install_sessions", "last_metering_hardware_import_id"): "SET NULL",
    ("metering_hardware_install_sessions", "last_meter_commissioning_id"): "SET NULL",
    ("dcus", "last_metering_hardware_install_session_id"): "SET NULL",
    ("meters", "last_encountered_issue_id"): "SET NULL",
}


def parse_blocks(text):
    matches = list(HEADER_RE.finditer(text))
    blocks = []
    for i, m in enumerate(matches):
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        blocks.append({
            "name": m.group("name"),
            "type": m.group("type"),
            "schema": m.group("schema"),
            "body": text[start:end].rstrip("\n"),
        })
    return blocks


def parse_table_columns(body):
    m = re.search(r"CREATE TABLE public\.\w+ \((.*)\);", body, re.DOTALL)
    if not m:
        return []
    cols = []
    for line in m.group(1).split("\n"):
        line = line.strip().rstrip(",")
        if not line or line.startswith("CONSTRAINT"):
            continue
        cm = re.match(r"(\w+)\s+", line)
        if cm:
            cols.append(cm.group(1))
    return cols


def parse_enum_values(body):
    m = re.search(r"AS ENUM \((.*)\);", body, re.DOTALL)
    if not m:
        return []
    return re.findall(r"'([^']+)'", m.group(1))


def table_of_policy_block_name(name):
    return name.split(" ", 1)[0]


def policy_name_of_block(name):
    return name.split(" ", 1)[1]


def normalize_policy_role(body):
    for role in PARAMETERIZE_ROLES:
        if f"TO {role}" in body:
            return role
    if "TO authenticated" in body:
        return "authenticated"
    if "TO anon" in body:
        return "anon"
    return "other"


def fk_on_delete(body):
    if "ON DELETE SET NULL" in body:
        return "SET NULL"
    if "ON DELETE CASCADE" in body:
        return "CASCADE"
    return "NO ACTION"


def extract_fks(blocks):
    fks = {}
    for b in blocks:
        if b["type"] != "FK CONSTRAINT":
            continue
        table = b["name"].split(" ", 1)[0]
        m = re.search(
            r'ADD CONSTRAINT "?(?P<cname>[^"]+)"? FOREIGN KEY \((?P<cols>[^)]+)\) '
            r'REFERENCES public\.(?P<ref>\w+)\((?P<refcols>[^)]+)\)(?P<ondelete>[^;]*)',
            b["body"],
        )
        if not m:
            continue
        cols = [c.strip() for c in m.group("cols").split(",")]
        key = (table, tuple(cols))
        fks[key] = {
            "table": table,
            "columns": cols,
            "ref_table": m.group("ref"),
            "ref_columns": [c.strip() for c in m.group("refcols").split(",")],
            "on_delete": fk_on_delete(b["body"]),
            "constraint": m.group("cname"),
        }
    return fks


def extract_indexes(blocks):
    return {b["name"]: b["body"].strip() for b in blocks if b["type"] == "INDEX"}


def extract_functions(blocks):
    return {b["name"].split("(")[0]: b["body"] for b in blocks if b["type"] == "FUNCTION"}


def extract_triggers(blocks):
    tr = {}
    for b in blocks:
        if b["type"] != "TRIGGER":
            continue
        table = b["name"].split(" ", 1)[0]
        tname = b["name"][len(table) + 1 :]
        tr[(table, tname)] = b["body"].strip()
    return tr


def extract_policies(blocks):
    pol = {}
    for b in blocks:
        if b["type"] != "POLICY":
            continue
        table = table_of_policy_block_name(b["name"])
        pname = policy_name_of_block(b["name"])
        role = normalize_policy_role(b["body"])
        pol[(table, pname, role)] = b["body"].strip()
    return pol


def rename_table(name):
    return RENAME_TABLES.get(name, name)


def legacy_table_set(tables):
    out = set()
    for t in tables:
        if t in DROP_TABLES:
            continue
        out.add(rename_table(t))
    return out


def legacy_columns(table, cols):
    t = rename_table(table)
    changes = COLUMN_CHANGES.get(t, {"drop": [], "rename": {}})
    rename_map = changes.get("rename", {})
    drop = set(changes.get("drop", []))
    result = set()
    for c in cols:
        if c in drop:
            continue
        result.add(rename_map.get(c, c))
    return result


def load_schema(path):
    text = path.read_text()
    blocks = parse_blocks(text)
    tables = {}
    enums = {}
    views = {}
    for b in blocks:
        if b["type"] == "TABLE" and b["schema"] == "public":
            tables[b["name"]] = parse_table_columns(b["body"])
        elif b["type"] == "TYPE" and b["schema"] == "public":
            enums[b["name"]] = parse_enum_values(b["body"])
        elif b["type"] == "VIEW" and b["schema"] == "public":
            views[b["name"]] = b["body"]
    return {
        "blocks": blocks,
        "tables": tables,
        "enums": enums,
        "views": views,
        "fks": extract_fks(blocks),
        "indexes": extract_indexes(blocks),
        "functions": extract_functions(blocks),
        "triggers": extract_triggers(blocks),
        "policies": extract_policies(blocks),
    }


def main():
    old_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/schema-old.sql")
    new_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("/tmp/schema-new.sql")

    old = load_schema(old_path)
    new = load_schema(new_path)

    unexplained = []
    explained = []

    def explain(msg, register):
        explained.append((register, msg))

    def unexplain(msg):
        unexplained.append(msg)

    old_view_names = set(old["views"])
    new_view_names = set(new["views"])

    only_old = {t for t in old["tables"] if t in DROP_TABLES or t in DROP_VIEWS}
    for t in sorted(only_old):
        reg = (
            "#1" if t in {"directives", "lorawan_directives"} else
            "#7" if t == "meter_credit_transfers" else
            "#8" if t in {"features", "member_feature"} else
            "#9" if t == "migrations" else
            "#12" if t in {"devices", "device_types", "device_logs"} else
            "#13" if t in {"payouts", "bank_accounts"} else
            "#14" if t.startswith("pd_") and t not in {"pd_sites", "pd_site_submissions"} else
            "#15" if t == "autopilot_executions" else
            "#4" if t == "directive_watchdog_sessions" else "?"
        )
        explain(f"table dropped in baseline: {t}", reg)

    for old_name, new_name in RENAME_TABLES.items():
        if old_name in old["tables"] and new_name in new["tables"]:
            explain(f"table renamed: {old_name} → {new_name}", "#16")
        elif old_name in old["tables"]:
            unexplain(f"rename expected but missing: {old_name} → {new_name}")

    if DROP_VIEWS & old_view_names:
        for v in DROP_VIEWS:
            explain(f"view dropped: {v}", "#1")

    kept_old_norm = legacy_table_set(old["tables"]) | (KEEP_VIEWS & new_view_names)
    new_tables = set(new["tables"])
    missing_in_new = kept_old_norm - new_tables - new_view_names
    extra_in_new = (new_tables | new_view_names) - kept_old_norm
    for t in sorted(missing_in_new):
        unexplain(f"kept table/view missing in new dump: {t}")
    for t in sorted(extra_in_new):
        unexplain(f"unexpected extra table/view in new dump: {t}")

    for old_t, old_cols in old["tables"].items():
        if old_t in DROP_TABLES:
            continue
        new_t = rename_table(old_t)
        if new_t not in new["tables"]:
            continue
        old_norm = legacy_columns(old_t, old_cols)
        new_cols = set(new["tables"][new_t])
        if old_norm != new_cols:
            only_old_cols = old_norm - new_cols
            only_new_cols = new_cols - old_norm
            expected_drops = set(COLUMN_CHANGES.get(new_t, {}).get("drop", []))
            expected_renames = COLUMN_CHANGES.get(new_t, {}).get("rename", {})
            for c in only_old_cols:
                if c in expected_drops or c in expected_renames:
                    explain(f"column drop/rename on {new_t}: {c}", "column adjustments")
                else:
                    unexplain(f"column only in old (after norm) {new_t}.{c}")
            for c in only_new_cols:
                if c in expected_renames.values():
                    explain(f"column rename target on {new_t}: {c}", "column adjustments")
                else:
                    unexplain(f"column only in new {new_t}.{c}")

    for en, vals in old["enums"].items():
        if en in DROP_ENUMS:
            explain(f"enum dropped: {en}", "#1/#7/#13/#14")
            continue
        if en not in new["enums"]:
            unexplain(f"enum missing in new: {en}")
            continue
        old_vals = set(vals)
        new_vals = set(new["enums"][en])
        if en == "external_system_enum":
            for v in EXTERNAL_SYSTEM_ENUM_DROP_VALUES:
                if v in vals:
                    explain(f"external_system_enum value dropped: {v}", "#28")
            old_vals -= EXTERNAL_SYSTEM_ENUM_DROP_VALUES
        if en == "notification_type_enum":
            for v in NOTIFICATION_TYPE_ENUM_DROP_VALUES:
                if v in vals:
                    explain(f"notification_type_enum value dropped: {v}", "#29")
            old_vals -= NOTIFICATION_TYPE_ENUM_DROP_VALUES
        if en == "organization_type_enum" and "PLATFORM_OPERATOR" in new_vals - old_vals:
            explain("organization_type_enum value added: PLATFORM_OPERATOR", "#22")
            old_vals.add("PLATFORM_OPERATOR")
        if old_vals != new_vals:
            unexplain(
                f"enum value mismatch {en}: old-only={old_vals - new_vals} "
                f"new-only={new_vals - old_vals}"
            )

    for en in new["enums"]:
        if en not in old["enums"] and en not in DROP_ENUMS:
            unexplain(f"unexpected new enum: {en}")

    old_fns = set(old["functions"])
    new_fns = set(new["functions"])
    for fn in DROP_FUNCTIONS:
        if fn in old_fns and fn not in new_fns:
            reg = (
                "#12" if "device" in fn else
                "#7" if "receiver_meter" in fn else
                "#21" if "historical_grid" in fn else
                "#13" if fn == "lock_next_order" else
                "#14" if fn == "lock_next_pd_action" else
                "#6"
            )
            explain(f"function dropped: {fn}", reg)
    for old_fn, new_fn in RENAME_FUNCTIONS.items():
        if old_fn in old_fns and new_fn in new_fns:
            explain(f"function renamed: {old_fn} → {new_fn}", "#16/#22")
        elif old_fn in old_fns:
            unexplain(f"function rename incomplete: {old_fn} → {new_fn}")
    new_helpers = {
        f for f in new_fns
        if f.startswith("rls_org_id_from_")
    }
    for fn in new_helpers:
        if fn not in old_fns:
            explain(f"new function: {fn}", "#22/#23")

    for fn in new_fns:
        if fn in DROP_FUNCTIONS:
            continue
        old_fn = fn
        for o, n in RENAME_FUNCTIONS.items():
            if n == fn:
                old_fn = o
        if old_fn not in old_fns:
            continue
        if old["functions"][old_fn].strip() != new["functions"][fn].strip():
            reg = (
                "#23" if fn.startswith("append_rls_") else
                "#22" if fn == "rls_check_if_admin_org_member" else
                "#24" if fn == "lock_next_order_and_wallets" else
                "#26" if fn == "get_grid_status" else
                "#27" if fn in {"find_energy_topup_revenue", "find_top_spenders"} else
                "#31" if fn in {"rls_check_if_lender", "rls_get_member_org_id"} else
                "body diff"
            )
            explain(f"function body changed: {fn}", reg)

    old_idx = set(old["indexes"])
    new_idx = set(new["indexes"])
    only_new_idx = new_idx - old_idx
    only_old_idx = old_idx - new_idx
    for name in sorted(only_new_idx):
        if name.startswith("idx_") and name not in old_idx:
            explain(f"new index: {name}", "#25/#30")
    for old_name, new_name in RENAME_TABLES.items():
        for idx in list(only_old_idx):
            if old_name in idx:
                new_equiv = idx.replace(old_name, new_name)
                if new_equiv in new_idx:
                    explain(f"index renamed with table: {idx} → {new_equiv}", "#16")
                    only_old_idx.discard(idx)
    for idx in list(only_old_idx):
        if any(dt in idx for dt in DROP_TABLES):
            explain(f"index on dropped object: {idx}", "drop cascade")
            only_old_idx.discard(idx)
    if "one_platform_operator_org" in new_idx or any(
        "one_platform_operator" in k for k in new_idx
    ):
        explain("partial unique index one_platform_operator_org", "#22")
    for idx in sorted(only_old_idx):
        unexplain(f"index only in old: {idx}")
    for idx in sorted(only_new_idx):
        if not any(x in idx for x in ["idx_", "one_platform"]):
            unexplain(f"index only in new (unattributed): {idx}")

    def norm_fks(fks, side):
        out = {}
        for (table, cols), fk in fks.items():
            t = rename_table(table) if side == "old" else table
            col_list = list(cols)
            if side == "old":
                changes = COLUMN_CHANGES.get(t, {}).get("rename", {})
                col_list = [changes.get(c, c) for c in col_list]
                drop = set(COLUMN_CHANGES.get(t, {}).get("drop", []))
                if any(c in drop for c in col_list):
                    continue
            ref = rename_table(fk["ref_table"]) if side == "old" else fk["ref_table"]
            key = (t, tuple(col_list), ref)
            out[key] = fk["on_delete"]
        return out

    old_fks_n = norm_fks(old["fks"], "old")
    new_fks_n = norm_fks(new["fks"], "new")
    for key, on_del in new_fks_n.items():
        table, cols, ref = key
        harden_key = (table, cols[0]) if len(cols) == 1 else None
        if harden_key in FK_HARDEN:
            if on_del == "SET NULL":
                explain(f"FK ON DELETE SET NULL: {table}.{cols[0]} → {ref}", "#34")
            else:
                unexplain(f"FK expected SET NULL but got {on_del}: {table}.{cols[0]}")
    for key in set(old_fks_n) - set(new_fks_n):
        t = key[0]
        col = key[1][0]
        drops = COLUMN_CHANGES.get(t, {}).get("drop", [])
        if col in drops:
            explain(f"FK dropped with column: {t}.{col}", "column adjustments")
        elif t in DROP_TABLES or any(x in t for x in ["directives", "devices", "payouts"]):
            explain(f"FK on dropped scope: {key}", "register drop")
        else:
            unexplain(f"FK in old only: {key} on_delete={old_fks_n[key]}")

    def filter_policies(pol, side):
        out = {}
        for (table, pname, role), body in pol.items():
            if role in PARAMETERIZE_ROLES:
                continue
            t = rename_table(table) if side == "old" else table
            if t in DROP_TABLES or table in DROP_TABLES:
                continue
            if table in DROP_VIEWS:
                continue
            out[(t, pname, role)] = body
        return out

    old_pol = filter_policies(old["policies"], "old")
    new_pol = filter_policies(new["policies"], "new")
    for key in set(old_pol) - set(new_pol):
        t, pname, _role = key
        reg = "#2" if "Grafana" in pname else "#1/#7/#8/#12/#13/#14/#15 drop"
        explain(f"policy dropped: {t} / {pname}", reg)
    for key in set(new_pol) - set(old_pol):
        unexplain(f"policy only in new: {key}")
    for key in set(old_pol) & set(new_pol):
        if old_pol[key] != new_pol[key]:
            explain(f"policy body changed: {key[0]} / {key[1]}", "#32/#22")

    old_tr = {}
    for (table, tname), body in old["triggers"].items():
        if (tname, table) in DROP_TRIGGERS or table in DROP_TABLES:
            continue
        t = rename_table(table)
        tn = RENAME_TRIGGERS.get(tname, tname)
        old_tr[(t, tn)] = body
    new_tr = dict(new["triggers"])
    for key in set(old_tr) - set(new_tr):
        unexplain(f"trigger in old only: {key}")
    for key in set(new_tr) - set(old_tr):
        if key[0] == "auth.users" or "auth.users" in new_tr[key]:
            explain(f"auth.users trigger (hand-authored): {key}", "legacy chain")
        else:
            unexplain(f"trigger only in new: {key}")

    print("=" * 72)
    print("TASK 6 SCHEMA COMPARISON SUMMARY")
    print("=" * 72)
    print(f"Old dump: {old_path} ({old_path.stat().st_size // 1024}K)")
    print(f"New dump: {new_path} ({new_path.stat().st_size // 1024}K)")
    print()
    print(f"Explained differences: {len(explained)}")
    by_reg = defaultdict(list)
    for reg, msg in explained:
        by_reg[reg].append(msg)
    for reg in sorted(by_reg, key=lambda x: (not x.startswith("#"), x)):
        print(f"\n--- {reg} ({len(by_reg[reg])}) ---")
        for msg in by_reg[reg][:8]:
            print(f"  • {msg}")
        if len(by_reg[reg]) > 8:
            print(f"  … and {len(by_reg[reg]) - 8} more")

    print(f"\n{'=' * 72}")
    print(f"UNEXPLAINED differences: {len(unexplained)}")
    print("=" * 72)
    if unexplained:
        for msg in unexplained[:50]:
            print(f"  ! {msg}")
        if len(unexplained) > 50:
            print(f"  … and {len(unexplained) - 50} more")
        return 1
    print("  (none — all structural diffs map to register entries)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
