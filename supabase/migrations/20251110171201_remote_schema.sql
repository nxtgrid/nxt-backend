alter type "public"."meter_interaction_type_enum" rename to "meter_interaction_type_enum__old_version_to_be_dropped";

create type "public"."meter_interaction_type_enum" as enum ('READ_CREDIT', 'READ_POWER_LIMIT', 'READ_VOLTAGE', 'SET_POWER_LIMIT', 'TOP_UP', 'TURN_ON', 'TURN_OFF', 'READ_POWER', 'READ_CURRENT', 'CLEAR_CREDIT', 'CLEAR_TAMPER', 'READ_REPORT');

alter table "public"."meter_interactions" alter column meter_interaction_type type "public"."meter_interaction_type_enum" using meter_interaction_type::text::"public"."meter_interaction_type_enum";

drop type "public"."meter_interaction_type_enum__old_version_to_be_dropped";

alter table "public"."meter_interactions" add column "meter_commissioning_id" integer;

alter table "public"."metering_hardware_imports" alter column "metering_hardware_install_session_id" set not null;

alter table "public"."meter_interactions" add constraint "meter_interactions_meter_commissioning_id_fkey" FOREIGN KEY (meter_commissioning_id) REFERENCES public.meter_commissionings(id) not valid;

alter table "public"."meter_interactions" validate constraint "meter_interactions_meter_commissioning_id_fkey";
