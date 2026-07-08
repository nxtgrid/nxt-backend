alter table "public"."meter_interactions" alter column "meter_interaction_status" drop default;

alter type "public"."meter_interaction_status_enum" rename to "meter_interaction_status_enum__old_version_to_be_dropped";

create type "public"."meter_interaction_status_enum" as enum ('QUEUED', 'ABORTED', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'DEFERRED');

alter table "public"."meter_interactions" alter column meter_interaction_status type "public"."meter_interaction_status_enum" using meter_interaction_status::text::"public"."meter_interaction_status_enum";

alter table "public"."meter_interactions" alter column "meter_interaction_status" set default 'QUEUED'::public.meter_interaction_status_enum;

drop type "public"."meter_interaction_status_enum__old_version_to_be_dropped";
