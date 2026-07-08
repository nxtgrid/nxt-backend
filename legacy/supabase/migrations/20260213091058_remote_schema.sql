drop index if exists "public"."idx_meter_interaction_meter_id";

alter type "public"."meter_interaction_type_enum" rename to "meter_interaction_type_enum__old_version_to_be_dropped";

create type "public"."meter_interaction_type_enum" as enum ('READ_CREDIT', 'READ_POWER_LIMIT', 'READ_VOLTAGE', 'SET_POWER_LIMIT', 'TOP_UP', 'TURN_ON', 'TURN_OFF', 'READ_POWER', 'READ_CURRENT', 'CLEAR_CREDIT', 'CLEAR_TAMPER', 'READ_REPORT', 'JOIN_NETWORK', 'DELIVER_PREEXISTING_TOKEN', 'READ_VERSION');

alter table "public"."directive_batches" alter column task_type type "public"."meter_interaction_type_enum" using task_type::text::"public"."meter_interaction_type_enum";

alter table "public"."meter_interactions" alter column meter_interaction_type type "public"."meter_interaction_type_enum" using meter_interaction_type::text::"public"."meter_interaction_type_enum";

drop type "public"."meter_interaction_type_enum__old_version_to_be_dropped";

CREATE INDEX idx_meter_interaction_meter_id_extra ON public.meter_interactions USING btree (meter_id, meter_interaction_type, created_at DESC);
