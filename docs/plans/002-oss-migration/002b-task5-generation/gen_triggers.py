import json, re
from registry import DROP_TABLES, RENAME_TABLES, DROP_TRIGGERS, RENAME_TRIGGERS, rename_table
from pathlib import Path

BASE = Path(__file__).parent

blocks = json.load(open(BASE / "blocks.json"))
trigger_blocks = [b for b in blocks if b["type"] == "TRIGGER"]

def apply_table_renames(text):
    for old, new in RENAME_TABLES.items():
        text = re.sub(rf"\bpublic\.{old}\b", f"public.{new}", text)
    return text

# The batch/batch-execution triggers also call the renamed function
FUNC_RENAME_IN_TRIGGER = {
    "append_rls_organization_id_by_directive_batch_id": "append_rls_organization_id_by_meter_command_batch_id",
}

out = []
for b in trigger_blocks:
    m = re.search(r"ON public\.(\w+)", b["body"])
    orig_table = m.group(1)
    # block name is "<table> <trigger_name>" — strip the table prefix
    trigger_name = b["name"][len(orig_table):].strip()
    if (trigger_name, orig_table) in DROP_TRIGGERS:
        continue
    if orig_table in DROP_TABLES:
        # shouldn't happen given DROP_TRIGGERS above, but guard anyway
        continue
    body = apply_table_renames(b["body"])
    for old_fn, new_fn in FUNC_RENAME_IN_TRIGGER.items():
        body = re.sub(rf"\bpublic\.{old_fn}\b", f"public.{new_fn}", body)
    name = trigger_name
    if name in RENAME_TRIGGERS:
        new_name = RENAME_TRIGGERS[name]
        body = re.sub(rf"\b{re.escape(name)}\b", new_name, body, count=1)
        name = new_name
    out.append(body.strip())

# auth.users triggers — sourced from the legacy migration chain directly since
# a --schema=public dump doesn't capture triggers defined on auth.users.
out.append(
    "CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();"
)
out.append(
    "CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_update_user();"
)

# New GUC-sync trigger (register #22)
out.append(
    "CREATE TRIGGER sync_admin_organization_id_guc_trigger AFTER INSERT OR DELETE OR UPDATE OF organization_type ON public.organizations FOR EACH STATEMENT EXECUTE FUNCTION public.sync_admin_organization_id_guc();"
)

with open(BASE / "sections" / "11-triggers-body.sql", "w") as f:
    f.write("\n\n".join(out) + "\n")
print("Kept/added triggers:", len(out))
