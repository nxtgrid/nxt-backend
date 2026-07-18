import json, re
from registry import DROP_TABLES, DROP_VIEWS, RENAME_TABLES, RENAME_FUNCTIONS, PARAMETERIZE_ROLES
from pathlib import Path

BASE = Path(__file__).parent

blocks = json.load(open(BASE / "blocks.json"))
policies = [b for b in blocks if b["type"] == "POLICY"]

def table_of(b):
    return b["name"].split(" ", 1)[0]

def apply_table_renames(text):
    for old, new in RENAME_TABLES.items():
        text = re.sub(rf"\bpublic\.{old}\b", f"public.{new}", text)
    return text

def apply_func_renames(text):
    for old, new in RENAME_FUNCTIONS.items():
        text = re.sub(rf"\bpublic\.{old}\(\)", f"public.{new}()", text)
        text = re.sub(rf"\bAS {old}\b", f"AS {new}", text)
    return text

# (table, policy_name) -> clause keyword to wrap ("USING" or "WITH CHECK")
WRAP_TARGETS = {
    ("grids", "Allow NXT Grid to insert"): "WITH CHECK",
    ("meters", "Allow NXT Grid to insert"): "WITH CHECK",
    ("notes", "Allow NXT Grid to insert"): "WITH CHECK",
    ("organizations", "Allow NXT Grid to insert"): "WITH CHECK",
    ("pd_sites", "Allow NXT Grid to insert"): "WITH CHECK",
    ("poles", "Allow NXT Grid to insert"): "WITH CHECK",
    ("wallets", "Allow NXT Grid to insert"): "WITH CHECK",
    ("accounts", "Allow NXT Grid to update"): "USING",
    ("connections", "Allow NXT Grid to update"): "USING",
    ("grids", "Allow NXT Grid to update"): "USING",
    ("meters", "Allow NXT Grid to update"): "USING",
    ("organizations", "Allow NXT Grid to update"): "USING",
    ("pd_site_submissions", "Allow NXT Grid to update"): "USING",
    ("pd_sites", "Allow NXT Grid to update"): "USING",
    ("notes", "Allow org members to insert"): "WITH CHECK",
    ("poles", "Allow org members to insert"): "WITH CHECK",
    ("accounts", "Allow org members to update"): "USING",
    ("orders", "Allow org members to update"): "USING",
}

def wrap_clause(text, clause):
    # text contains e.g. USING (public.rls_check_if_admin_org_member());
    # or WITH CHECK ((public.rls_get_member_org_id() = rls_organization_id));
    # Wrap the *inner* boolean expression in ( SELECT <expr> AS <alias>).
    pattern = re.compile(rf"{clause} \((.*)\);\s*$", re.DOTALL)
    m = pattern.search(text.rstrip())
    if not m:
        raise ValueError(f"Could not locate {clause} clause in: {text!r}")
    inner = m.group(1)
    # Alias: function name for a bare call, or the clause keyword lowercased for
    # a composite boolean expr — matches the dump's own convention of aliasing
    # by the wrapped function's name; for composite exprs there's no dump
    # precedent, so we mirror the simple-call convention using the helper
    # function name found inside.
    fn_match = re.search(r"public\.(\w+)\(", inner)
    alias = fn_match.group(1) if fn_match else "check"
    replacement = f"{clause} (( SELECT {inner} AS {alias}))"
    return text[: m.start()] + replacement + ";\n"

out = []
wrapped_count = 0
for b in policies:
    t = table_of(b)
    if t in DROP_TABLES or t in DROP_VIEWS:
        continue
    if any(f"TO {r}" in b["body"] for r in PARAMETERIZE_ROLES):
        continue

    policy_name = b["name"][len(t) + 1:]
    text = apply_func_renames(apply_table_renames(b["body"].strip()))
    renamed_t = RENAME_TABLES.get(t, t)

    key = (renamed_t, policy_name)
    if key in WRAP_TARGETS:
        text = wrap_clause(text, WRAP_TARGETS[key])
        wrapped_count += 1

    out.append(text.rstrip())

with open(BASE / "sections" / "13-policies-body.sql", "w") as f:
    f.write("\n\n".join(out) + "\n")

print(f"Kept policies: {len(out)}, wrapped: {wrapped_count}")
