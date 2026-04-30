alter table "public"."meter_interactions" add column "batch_execution_id" integer;

CREATE UNIQUE INDEX meter_interactions_order_id_key ON public.meter_interactions USING btree (order_id);

alter table "public"."meter_interactions" add constraint "meter_interactions_batch_execution_id_fkey" FOREIGN KEY (batch_execution_id) REFERENCES public.directive_batch_executions(id) not valid;

alter table "public"."meter_interactions" validate constraint "meter_interactions_batch_execution_id_fkey";

alter table "public"."meter_interactions" add constraint "meter_interactions_order_id_key" UNIQUE using index "meter_interactions_order_id_key";
