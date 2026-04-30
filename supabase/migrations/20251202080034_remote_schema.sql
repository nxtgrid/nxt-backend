alter table "public"."meter_interactions" add column "retry_history" jsonb;

alter table "public"."meter_interactions" alter column "updated_at" set default now();

alter table "public"."meter_interactions" alter column "updated_at" set not null;
