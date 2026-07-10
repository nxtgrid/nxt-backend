"""Authoritative keep/drop/rename registry for Task 5, derived from
docs/plans/002-oss-migration/002b-schema-deviation-register.md.
"""

DROP_TABLES = {
    "directives", "lorawan_directives", "meter_credit_transfers",
    "directive_watchdog_sessions", "features", "member_feature", "migrations",
    "devices", "device_types", "device_logs", "payouts", "bank_accounts",
    "pd_flows", "pd_flow_templates", "pd_sections", "pd_section_templates",
    "pd_actions", "pd_action_templates", "pd_documents", "pd_document_templates",
    "pd_audits", "autopilot_executions",
}

RENAME_TABLES = {
    "directive_batches": "meter_command_batches",
    "directive_batch_executions": "meter_command_batch_executions",
}

DROP_ENUMS = {
    "directive_direction_enum", "directive_error_enum", "directive_phase_enum",
    "directive_special_status_enum", "directive_status_enum", "directive_type_enum",
    "meter_credit_transfer_status_enum", "payout_status_enum",
    "pd_action_status_enum", "pd_action_type_enum", "pd_document_type_enum",
}

DROP_VIEWS = {"batch_commands"}
KEEP_VIEWS = {"agents_with_account", "customers_with_account", "meters_with_account_and_statuses"}

DROP_FUNCTIONS = {
    "append_rls_organization_id_by_device_id",
    "append_rls_organization_id_by_receiver_meter_id",
    "append_rls_organization_id_by_historical_grid_id",
    "lock_next_order",
    "lock_next_pd_action",
    "notify_make_about_is_fs_on_updated",
    "notify_make_about_is_hps_on_updated",
    "notify_make_about_kwh_tariff_essential_service_updated",
}

RENAME_FUNCTIONS = {
    "append_rls_organization_id_by_directive_batch_id": "append_rls_organization_id_by_meter_command_batch_id",
    "rls_check_if_nxt_member": "rls_check_if_admin_org_member",
}

# trigger name -> table it's defined on, used to disambiguate the one trigger
# whose name collides with a function name (append_rls_organization_id_by_device_id)
DROP_TRIGGERS = {
    ("append_rls_organization_id_by_device_id", "device_logs"),
    ("append_rls_organization_id_on_devices_insert", "devices"),
    ("append_rls_organization_id_on_directive_insert", "directives"),
    ("append_rls_organization_id_on_lorawan_directive_insert", "lorawan_directives"),
    ("append_rls_organization_id_on_meter_credit_transfer_insert", "meter_credit_transfers"),
    ("notify_make_about_is_fs_on_updated", "grids"),
    ("notify_make_about_is_hps_on_updated", "grids"),
    ("notify_make_about_kwh_tariff_essential_service_updated", "grids"),
}

RENAME_TRIGGERS = {
    "append_rls_organization_id_on_directive_batch_insert": "append_rls_organization_id_on_meter_command_batch_insert",
    "append_rls_organization_id_on_directive_batch_execution_insert": "append_rls_organization_id_on_meter_command_batch_execution_insert",
    "append_rls_organization_id_on_route_insert": "append_rls_organization_id_on_router_insert",
}

DROP_SEQUENCES = {
    "bank_accounts_id_seq", "directive_watchdog_sessions_id_seq", "directives_id_seq",
    "features_id_seq", "meter_credit_transfers_id_seq", "migrations_id_seq",
    "payouts_id_seq",
    # identity-column sequences on dropped tables (auto-dropped with the table)
    "autopilot_executions_id_seq", "device_logs_id_seq", "device_types_id_seq",
    "devices_id_seq", "lorawan_directives_id_seq", "pd_action_templates_id_seq",
    "pd_actions_id_seq", "pd_audits_id_seq", "pd_document_templates_id_seq",
    "pd_documents_id_seq", "pd_flow_templates_id_seq", "pd_flows_id_seq",
    "pd_section_templates_id_seq", "pd_sections_id_seq",
}

RENAME_SEQUENCES = {
    "directive_batches_id_seq": "meter_command_batches_id_seq",
    "directive_batch_executions_id_seq": "meter_command_batch_executions_id_seq",
}

# Column-level drops/renames on KEPT tables/views, from the deviation register
# "Column adjustments" section (post-rename table names used as keys).
COLUMN_CHANGES = {
    "orders": {
        "drop": ["directive_id", "lorawan_directive_id", "meter_credit_transfer_id", "external_system"],
        "rename": {},
    },
    "meter_command_batches": {
        "drop": ["directive_type", "lock_session", "execution_bucket"],
        "rename": {},
    },
    "meter_command_batch_executions": {
        "drop": [],
        "rename": {"directive_batch_id": "meter_command_batch_id"},
    },
    "meters": {
        "drop": [
            "current_special_status", "device_id", "watchdog_session",
            "watchdog_last_run_at", "power_down_count", "power_down_count_updated_at",
            "is_simulated", "pulse_counter_kwh", "pulse_counter_kwh_updated_at",
        ],
        "rename": {},
    },
    "grids": {
        "drop": [
            "is_automatic_payout_generation_enabled", "are_all_dcus_online",
            "are_all_dcus_under_high_load_threshold",
            "meter_consumption_issue_threshold_detection_days",
            "meter_communication_issue_threshold_detection_days",
            "uses_dual_meter_setup", "telegram_response_path_autopilot",
        ],
        "rename": {},
    },
    "pd_sites": {"drop": ["pd_flow_id"], "rename": {}},
    "organizations": {"drop": ["pd_hero_google_drive_folder_id", "phone", "address"], "rename": {}},
    "api_keys": {"drop": ["is_locked"], "rename": {}},
    "dcus": {"drop": ["queue_buffer_length"], "rename": {}},
    "meter_commissionings": {
        "drop": [
            "initialised_steps", "pending_steps", "processing_steps",
            "successful_steps", "failed_steps", "total_steps", "lock_session",
        ],
        "rename": {},
    },
    "wallets": {"drop": ["goldring_migration_id"], "rename": {}},
    "issues": {
        "drop": ["estimated_lost_revenue", "snoozed_until", "mppt_id", "grid_id"],
        "rename": {"external_system": "external_tracking_system", "external_reference": "external_tracking_reference"},
    },
}

# View column changes (same underlying columns, view is a separate object)
VIEW_COLUMN_CHANGES = {
    "meters_with_account_and_statuses": {
        "drop": [
            "current_special_status", "device_id", "watchdog_session",
            "watchdog_last_run_at", "power_down_count", "power_down_count_updated_at",
            "is_simulated", "pulse_counter_kwh", "pulse_counter_kwh_updated_at",
        ],
    },
}

EXTERNAL_SYSTEM_ENUM_DROP_VALUES = {"JOTFORM", "STEAMACO", "ACREL"}
NOTIFICATION_TYPE_ENUM_DROP_VALUES = {"AUTO_PAYOUT_GENRATION_REPORT"}

# Readonly / company-infra roles parameterized out entirely (register #2/#3/#5/#6)
PARAMETERIZE_ROLES = {"grafana_readonly", "make_readonly", "snaplet_readonly_2"}

DATA_API_ROLES = {"anon", "authenticated", "service_role"}


def table_kept(name: str) -> bool:
    return name not in DROP_TABLES


def rename_table(name: str) -> str:
    return RENAME_TABLES.get(name, name)
