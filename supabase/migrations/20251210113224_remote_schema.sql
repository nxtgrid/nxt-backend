alter table "public"."directive_batch_executions" add column "completed_at" timestamp with time zone;

alter table "public"."directive_batch_executions" add column "qualified_at" timestamp with time zone;

create policy "Allow org members to select"
on "public"."meter_interactions"
as permissive
for select
to authenticated
using (true);
