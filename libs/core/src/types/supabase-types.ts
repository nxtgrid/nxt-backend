export type Json = Record<string, any>

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          email: string | null;
          full_name: string | null;
          id: number;
          organization_id: number | null;
          phone: string | null;
          supabase_id: string | null;
          telegram_id: string | null;
          telegram_link_token: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: number;
          organization_id?: number | null;
          phone?: string | null;
          supabase_id?: string | null;
          telegram_id?: string | null;
          telegram_link_token?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: number;
          organization_id?: number | null;
          phone?: string | null;
          supabase_id?: string | null;
          telegram_id?: string | null;
          telegram_link_token?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_238d61e0f8ac37278f726efac20';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      agents: {
        Row: {
          account_id: number | null;
          created_at: string;
          grid_id: number | null;
          id: number;
          rls_organization_id: number | null;
        };
        Insert: {
          account_id?: number | null;
          created_at?: string;
          grid_id?: number | null;
          id?: number;
          rls_organization_id?: number | null;
        };
        Update: {
          account_id?: number | null;
          created_at?: string;
          grid_id?: number | null;
          id?: number;
          rls_organization_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'agents_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_9bb7cb7efc780ec4d3dec34354f';
            columns: ['grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_df520decc9e003a843d8edd9867';
            columns: ['account_id'];
            isOneToOne: true;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      api_keys: {
        Row: {
          account_id: number | null;
          created_at: string;
          id: number;
          key: string | null;
        };
        Insert: {
          account_id?: number | null;
          created_at?: string;
          id?: number;
          key?: string | null;
        };
        Update: {
          account_id?: number | null;
          created_at?: string;
          id?: number;
          key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_decaf331589778e33441b2a8d9e';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      audits: {
        Row: {
          agent_id: number | null;
          author_id: number | null;
          connection_id: number | null;
          created_at: string;
          customer_id: number | null;
          dcu_id: number | null;
          from_fs_command: boolean;
          grid_id: number | null;
          id: number;
          member_id: number | null;
          message: string;
          meter_id: number | null;
          organization_id: number | null;
        };
        Insert: {
          agent_id?: number | null;
          author_id?: number | null;
          connection_id?: number | null;
          created_at?: string;
          customer_id?: number | null;
          dcu_id?: number | null;
          from_fs_command?: boolean;
          grid_id?: number | null;
          id?: number;
          member_id?: number | null;
          message: string;
          meter_id?: number | null;
          organization_id?: number | null;
        };
        Update: {
          agent_id?: number | null;
          author_id?: number | null;
          connection_id?: number | null;
          created_at?: string;
          customer_id?: number | null;
          dcu_id?: number | null;
          from_fs_command?: boolean;
          grid_id?: number | null;
          id?: number;
          member_id?: number | null;
          message?: string;
          meter_id?: number | null;
          organization_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_18c521072a6ca9d57365ffb24fe';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_18c521072a6ca9d57365ffb24fe';
            columns: ['agent_id'];
            isOneToOne: false;
            referencedRelation: 'agents_with_account';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_236a383b1007cf64f0c8c7f6534';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_236a383b1007cf64f0c8c7f6534';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers_with_account';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_2d52a7fc85cfbb0421af977766e';
            columns: ['grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_2fc5f64b328675b5203d54c7929';
            columns: ['connection_id'];
            isOneToOne: false;
            referencedRelation: 'connections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_336b627b254b70b0702436e6aff';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_4a300197465db92edfc5563d20b';
            columns: ['meter_id'];
            isOneToOne: false;
            referencedRelation: 'meters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_4a300197465db92edfc5563d20b';
            columns: ['meter_id'];
            isOneToOne: false;
            referencedRelation: 'meters_with_account_and_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_abde505f056e2f46c5df2c12491';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_e3f3409859562fbe10b78d1399e';
            columns: ['member_id'];
            isOneToOne: false;
            referencedRelation: 'members';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_eb582acfd9d83af268d328e0b79';
            columns: ['dcu_id'];
            isOneToOne: false;
            referencedRelation: 'dcus';
            referencedColumns: ['id'];
          },
        ];
      };
      banks: {
        Row: {
          created_at: string;
          external_id: string;
          id: number;
          name: string;
        };
        Insert: {
          created_at?: string;
          external_id: string;
          id?: number;
          name: string;
        };
        Update: {
          created_at?: string;
          external_id?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      connection_requested_meters: {
        Row: {
          connection_id: number;
          created_at: string;
          deleted_at: string | null;
          fee: number;
          id: number;
          meter_phase: Database['public']['Enums']['meter_phase_enum'];
          meter_type: Database['public']['Enums']['meter_type_enum'];
          rls_organization_id: number | null;
        };
        Insert: {
          connection_id: number;
          created_at?: string;
          deleted_at?: string | null;
          fee?: number;
          id?: number;
          meter_phase: Database['public']['Enums']['meter_phase_enum'];
          meter_type: Database['public']['Enums']['meter_type_enum'];
          rls_organization_id?: number | null;
        };
        Update: {
          connection_id?: number;
          created_at?: string;
          deleted_at?: string | null;
          fee?: number;
          id?: number;
          meter_phase?: Database['public']['Enums']['meter_phase_enum'];
          meter_type?: Database['public']['Enums']['meter_type_enum'];
          rls_organization_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'connection_requested_meters_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_d390197863e9a88be5e122d9695';
            columns: ['connection_id'];
            isOneToOne: false;
            referencedRelation: 'connections';
            referencedColumns: ['id'];
          },
        ];
      };
      connections: {
        Row: {
          created_at: string;
          currency: Database['public']['Enums']['currency_enum'];
          customer_id: number | null;
          deleted_at: string | null;
          document_id: string | null;
          document_type:
            Database['public']['Enums']['id_document_type_enum'] | null;
          external_system:
            Database['public']['Enums']['external_system_enum'] | null;
          id: number;
          is_building_wired: boolean | null;
          is_commercial: boolean;
          is_lifeline: boolean | null;
          is_public: boolean;
          is_residential: boolean;
          is_using_led_bulbs: boolean | null;
          paid: number;
          rls_organization_id: number | null;
          upload_uuid: string | null;
          women_impacted: number;
        };
        Insert: {
          created_at?: string;
          currency: Database['public']['Enums']['currency_enum'];
          customer_id?: number | null;
          deleted_at?: string | null;
          document_id?: string | null;
          document_type?:
            Database['public']['Enums']['id_document_type_enum'] | null;
          external_system?:
            Database['public']['Enums']['external_system_enum'] | null;
          id?: number;
          is_building_wired?: boolean | null;
          is_commercial: boolean;
          is_lifeline?: boolean | null;
          is_public: boolean;
          is_residential: boolean;
          is_using_led_bulbs?: boolean | null;
          paid?: number;
          rls_organization_id?: number | null;
          upload_uuid?: string | null;
          women_impacted: number;
        };
        Update: {
          created_at?: string;
          currency?: Database['public']['Enums']['currency_enum'];
          customer_id?: number | null;
          deleted_at?: string | null;
          document_id?: string | null;
          document_type?:
            Database['public']['Enums']['id_document_type_enum'] | null;
          external_system?:
            Database['public']['Enums']['external_system_enum'] | null;
          id?: number;
          is_building_wired?: boolean | null;
          is_commercial?: boolean;
          is_lifeline?: boolean | null;
          is_public?: boolean;
          is_residential?: boolean;
          is_using_led_bulbs?: boolean | null;
          paid?: number;
          rls_organization_id?: number | null;
          upload_uuid?: string | null;
          women_impacted?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'connections_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_37f79eb1e29a53cc582fbb805e0';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_37f79eb1e29a53cc582fbb805e0';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers_with_account';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: {
          account_id: number | null;
          created_at: string;
          gender: Database['public']['Enums']['gender_enum'] | null;
          generator_owned:
            Database['public']['Enums']['generator_type_enum'] | null;
          grid_id: number | null;
          id: number;
          is_hidden_from_reporting: boolean;
          latitude: number | null;
          lives_primarily_in_the_community: boolean;
          longitude: number | null;
          rls_organization_id: number | null;
          total_connection_fee: number;
          total_connection_paid: number;
        };
        Insert: {
          account_id?: number | null;
          created_at?: string;
          gender?: Database['public']['Enums']['gender_enum'] | null;
          generator_owned?:
            Database['public']['Enums']['generator_type_enum'] | null;
          grid_id?: number | null;
          id?: number;
          is_hidden_from_reporting?: boolean;
          latitude?: number | null;
          lives_primarily_in_the_community?: boolean;
          longitude?: number | null;
          rls_organization_id?: number | null;
          total_connection_fee?: number;
          total_connection_paid?: number;
        };
        Update: {
          account_id?: number | null;
          created_at?: string;
          gender?: Database['public']['Enums']['gender_enum'] | null;
          generator_owned?:
            Database['public']['Enums']['generator_type_enum'] | null;
          grid_id?: number | null;
          id?: number;
          is_hidden_from_reporting?: boolean;
          latitude?: number | null;
          lives_primarily_in_the_community?: boolean;
          longitude?: number | null;
          rls_organization_id?: number | null;
          total_connection_fee?: number;
          total_connection_paid?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_51a88ee1d4fceb047e7cfda3baa';
            columns: ['grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_ebcc29963874e55053e8ee80be5';
            columns: ['account_id'];
            isOneToOne: true;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      dcus: {
        Row: {
          communication_protocol:
            Database['public']['Enums']['communication_protocol_enum'] | null;
          created_at: string;
          external_reference: string;
          external_system: Database['public']['Enums']['external_system_enum'];
          grid_id: number | null;
          id: number;
          is_online: boolean;
          is_online_updated_at: string | null;
          last_metering_hardware_install_session_id: number | null;
          last_online_at: string | null;
          location_geom: unknown;
          rls_organization_id: number | null;
        };
        Insert: {
          communication_protocol?:
            Database['public']['Enums']['communication_protocol_enum'] | null;
          created_at?: string;
          external_reference: string;
          external_system: Database['public']['Enums']['external_system_enum'];
          grid_id?: number | null;
          id?: number;
          is_online?: boolean;
          is_online_updated_at?: string | null;
          last_metering_hardware_install_session_id?: number | null;
          last_online_at?: string | null;
          location_geom?: unknown;
          rls_organization_id?: number | null;
        };
        Update: {
          communication_protocol?:
            Database['public']['Enums']['communication_protocol_enum'] | null;
          created_at?: string;
          external_reference?: string;
          external_system?: Database['public']['Enums']['external_system_enum'];
          grid_id?: number | null;
          id?: number;
          is_online?: boolean;
          is_online_updated_at?: string | null;
          last_metering_hardware_install_session_id?: number | null;
          last_online_at?: string | null;
          location_geom?: unknown;
          rls_organization_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'dcus_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_254c3db39098da62eb3f96f0006';
            columns: ['grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_9334b587e6e5291f8ccd1b11c44';
            columns: ['last_metering_hardware_install_session_id'];
            isOneToOne: true;
            referencedRelation: 'metering_hardware_install_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      energy_cabins: {
        Row: {
          created_at: string;
          grid_id: number;
          id: number;
          location_geom: unknown;
          rls_organization_id: number | null;
        };
        Insert: {
          created_at?: string;
          grid_id: number;
          id?: number;
          location_geom: unknown;
          rls_organization_id?: number | null;
        };
        Update: {
          created_at?: string;
          grid_id?: number;
          id?: number;
          location_geom?: unknown;
          rls_organization_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'energy_cabins_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_ba81ffc1506025a549849f06f36';
            columns: ['grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
        ];
      };
      grids: {
        Row: {
          commissioned_at: string | null;
          created_at: string;
          current_weather:
            Database['public']['Enums']['weather_type_enum'] | null;
          default_fs_1_phase_connection_fee: number;
          default_fs_3_phase_connection_fee: number;
          default_hps_connection_fee: number;
          deleted_at: string | null;
          deployed_at: string | null;
          feature_access_config: Json;
          generation_external_gateway_id: string | null;
          generation_external_site_id: string | null;
          generation_external_system: Database['public']['Enums']['external_system_enum'];
          generation_gateway_last_seen_at: string | null;
          id: number;
          identifier: number | null;
          internal_telegram_group_chat_id: string | null;
          internal_telegram_group_thread_id: string | null;
          is_automatic_energy_generation_data_sync_enabled: boolean;
          is_automatic_meter_energy_consumption_data_sync_enabled: boolean;
          is_automatic_meter_install_enabled: boolean;
          is_cabin_meter_credit_depleting: boolean;
          is_dcu_connectivity_tracking_enabled: boolean;
          is_energised_notification_enabled: boolean;
          is_fs_control_rule_change_notification_enabled: boolean;
          is_fs_on: boolean;
          is_fs_on_notification_enabled: boolean;
          is_fs_on_updated_at: string | null;
          is_generation_managed_by_nxt_grid: boolean;
          is_hidden_from_reporting: boolean;
          is_hps_on: boolean;
          is_hps_on_threshold_kw: number;
          is_hps_on_updated_at: string | null;
          is_metering_hardware_online_notification_enabled: boolean;
          is_panel_cleaning_notification_enabled: boolean;
          is_router_connectivity_tracking_enabled: boolean;
          is_tariff_change_notification_enabled: boolean;
          is_three_phase_supported: boolean;
          is_upcoming_fs_control_rule_notification_enabled: boolean;
          is_using_mobile_network: boolean;
          is_using_vsat: boolean;
          kwh: number;
          kwh_per_battery_module: number | null;
          kwh_tariff: number;
          kwh_tariff_essential_service: number;
          kwh_tariff_full_service: number;
          kwp: number;
          kwp_tariff: number;
          lifeline_connection_days_threshold: number;
          lifeline_connection_kwh_threshold: number;
          location_geom: unknown;
          meter_commissioning_initial_credit_kwh: number;
          metering_external_system: Database['public']['Enums']['external_system_enum'];
          monthly_rental: number;
          name: string;
          organization_id: number;
          should_fs_be_on: boolean;
          should_fs_be_on_updated_at: string | null;
          telegram_config: Json | null;
          telegram_notification_channel_invite_link: string | null;
          telegram_response_path_token: string | null;
          timezone: string;
          walkthrough_external_id: string | null;
        };
        Insert: {
          commissioned_at?: string | null;
          created_at?: string;
          current_weather?:
            Database['public']['Enums']['weather_type_enum'] | null;
          default_fs_1_phase_connection_fee?: number;
          default_fs_3_phase_connection_fee?: number;
          default_hps_connection_fee?: number;
          deleted_at?: string | null;
          deployed_at?: string | null;
          feature_access_config?: Json;
          generation_external_gateway_id?: string | null;
          generation_external_site_id?: string | null;
          generation_external_system?: Database['public']['Enums']['external_system_enum'];
          generation_gateway_last_seen_at?: string | null;
          id?: number;
          identifier?: number | null;
          internal_telegram_group_chat_id?: string | null;
          internal_telegram_group_thread_id?: string | null;
          is_automatic_energy_generation_data_sync_enabled?: boolean;
          is_automatic_meter_energy_consumption_data_sync_enabled?: boolean;
          is_automatic_meter_install_enabled?: boolean;
          is_cabin_meter_credit_depleting?: boolean;
          is_dcu_connectivity_tracking_enabled?: boolean;
          is_energised_notification_enabled?: boolean;
          is_fs_control_rule_change_notification_enabled?: boolean;
          is_fs_on?: boolean;
          is_fs_on_notification_enabled?: boolean;
          is_fs_on_updated_at?: string | null;
          is_generation_managed_by_nxt_grid?: boolean;
          is_hidden_from_reporting?: boolean;
          is_hps_on?: boolean;
          is_hps_on_threshold_kw?: number;
          is_hps_on_updated_at?: string | null;
          is_metering_hardware_online_notification_enabled?: boolean;
          is_panel_cleaning_notification_enabled?: boolean;
          is_router_connectivity_tracking_enabled?: boolean;
          is_tariff_change_notification_enabled?: boolean;
          is_three_phase_supported?: boolean;
          is_upcoming_fs_control_rule_notification_enabled?: boolean;
          is_using_mobile_network?: boolean;
          is_using_vsat?: boolean;
          kwh?: number;
          kwh_per_battery_module?: number | null;
          kwh_tariff?: number;
          kwh_tariff_essential_service?: number;
          kwh_tariff_full_service?: number;
          kwp?: number;
          kwp_tariff?: number;
          lifeline_connection_days_threshold?: number;
          lifeline_connection_kwh_threshold?: number;
          location_geom?: unknown;
          meter_commissioning_initial_credit_kwh?: number;
          metering_external_system?: Database['public']['Enums']['external_system_enum'];
          monthly_rental?: number;
          name: string;
          organization_id: number;
          should_fs_be_on?: boolean;
          should_fs_be_on_updated_at?: string | null;
          telegram_config?: Json | null;
          telegram_notification_channel_invite_link?: string | null;
          telegram_response_path_token?: string | null;
          timezone?: string;
          walkthrough_external_id?: string | null;
        };
        Update: {
          commissioned_at?: string | null;
          created_at?: string;
          current_weather?:
            Database['public']['Enums']['weather_type_enum'] | null;
          default_fs_1_phase_connection_fee?: number;
          default_fs_3_phase_connection_fee?: number;
          default_hps_connection_fee?: number;
          deleted_at?: string | null;
          deployed_at?: string | null;
          feature_access_config?: Json;
          generation_external_gateway_id?: string | null;
          generation_external_site_id?: string | null;
          generation_external_system?: Database['public']['Enums']['external_system_enum'];
          generation_gateway_last_seen_at?: string | null;
          id?: number;
          identifier?: number | null;
          internal_telegram_group_chat_id?: string | null;
          internal_telegram_group_thread_id?: string | null;
          is_automatic_energy_generation_data_sync_enabled?: boolean;
          is_automatic_meter_energy_consumption_data_sync_enabled?: boolean;
          is_automatic_meter_install_enabled?: boolean;
          is_cabin_meter_credit_depleting?: boolean;
          is_dcu_connectivity_tracking_enabled?: boolean;
          is_energised_notification_enabled?: boolean;
          is_fs_control_rule_change_notification_enabled?: boolean;
          is_fs_on?: boolean;
          is_fs_on_notification_enabled?: boolean;
          is_fs_on_updated_at?: string | null;
          is_generation_managed_by_nxt_grid?: boolean;
          is_hidden_from_reporting?: boolean;
          is_hps_on?: boolean;
          is_hps_on_threshold_kw?: number;
          is_hps_on_updated_at?: string | null;
          is_metering_hardware_online_notification_enabled?: boolean;
          is_panel_cleaning_notification_enabled?: boolean;
          is_router_connectivity_tracking_enabled?: boolean;
          is_tariff_change_notification_enabled?: boolean;
          is_three_phase_supported?: boolean;
          is_upcoming_fs_control_rule_notification_enabled?: boolean;
          is_using_mobile_network?: boolean;
          is_using_vsat?: boolean;
          kwh?: number;
          kwh_per_battery_module?: number | null;
          kwh_tariff?: number;
          kwh_tariff_essential_service?: number;
          kwh_tariff_full_service?: number;
          kwp?: number;
          kwp_tariff?: number;
          lifeline_connection_days_threshold?: number;
          lifeline_connection_kwh_threshold?: number;
          location_geom?: unknown;
          meter_commissioning_initial_credit_kwh?: number;
          metering_external_system?: Database['public']['Enums']['external_system_enum'];
          monthly_rental?: number;
          name?: string;
          organization_id?: number;
          should_fs_be_on?: boolean;
          should_fs_be_on_updated_at?: string | null;
          telegram_config?: Json | null;
          telegram_notification_channel_invite_link?: string | null;
          telegram_response_path_token?: string | null;
          timezone?: string;
          walkthrough_external_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_433ef6a589cd535dff42b34612e';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      issues: {
        Row: {
          closed_at: string | null;
          created_at: string;
          external_tracking_reference: string | null;
          external_tracking_system: Database['public']['Enums']['external_system_enum'];
          id: number;
          issue_status: Database['public']['Enums']['issue_status_enum'];
          issue_type: Database['public']['Enums']['issue_type_enum'];
          meter_id: number | null;
          rls_organization_id: number | null;
          started_at: string | null;
        };
        Insert: {
          closed_at?: string | null;
          created_at?: string;
          external_tracking_reference?: string | null;
          external_tracking_system?: Database['public']['Enums']['external_system_enum'];
          id?: number;
          issue_status?: Database['public']['Enums']['issue_status_enum'];
          issue_type: Database['public']['Enums']['issue_type_enum'];
          meter_id?: number | null;
          rls_organization_id?: number | null;
          started_at?: string | null;
        };
        Update: {
          closed_at?: string | null;
          created_at?: string;
          external_tracking_reference?: string | null;
          external_tracking_system?: Database['public']['Enums']['external_system_enum'];
          id?: number;
          issue_status?: Database['public']['Enums']['issue_status_enum'];
          issue_type?: Database['public']['Enums']['issue_type_enum'];
          meter_id?: number | null;
          rls_organization_id?: number | null;
          started_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_7b15f3fbbedf51a1a3d21583b7e';
            columns: ['meter_id'];
            isOneToOne: false;
            referencedRelation: 'meters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_7b15f3fbbedf51a1a3d21583b7e';
            columns: ['meter_id'];
            isOneToOne: false;
            referencedRelation: 'meters_with_account_and_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'issues_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      members: {
        Row: {
          account_id: number | null;
          busy_commissioning_id: number | null;
          created_at: string;
          hidden: boolean;
          id: number;
          member_type: Database['public']['Enums']['member_type_enum'];
          rls_organization_id: number | null;
          subscribed_to_telegram_revenue_notifications: boolean;
          training_level: number;
        };
        Insert: {
          account_id?: number | null;
          busy_commissioning_id?: number | null;
          created_at?: string;
          hidden?: boolean;
          id?: number;
          member_type?: Database['public']['Enums']['member_type_enum'];
          rls_organization_id?: number | null;
          subscribed_to_telegram_revenue_notifications?: boolean;
          training_level?: number;
        };
        Update: {
          account_id?: number | null;
          busy_commissioning_id?: number | null;
          created_at?: string;
          hidden?: boolean;
          id?: number;
          member_type?: Database['public']['Enums']['member_type_enum'];
          rls_organization_id?: number | null;
          subscribed_to_telegram_revenue_notifications?: boolean;
          training_level?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_a9da2a35fdd2cd46a7bfc57fd73';
            columns: ['busy_commissioning_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_fd9dfb97e21b75fc45d42aa614a';
            columns: ['account_id'];
            isOneToOne: true;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'members_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      meter_command_batch_executions: {
        Row: {
          completed_at: string | null;
          created_at: string;
          failed_count: number;
          id: number;
          meter_command_batch_id: number;
          pending_count: number;
          processed_count: number;
          processing_count: number;
          qualified_at: string | null;
          rls_organization_id: number | null;
          successful_count: number;
          total_count: number;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          failed_count?: number;
          id?: number;
          meter_command_batch_id: number;
          pending_count?: number;
          processed_count?: number;
          processing_count?: number;
          qualified_at?: string | null;
          rls_organization_id?: number | null;
          successful_count?: number;
          total_count?: number;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          failed_count?: number;
          id?: number;
          meter_command_batch_id?: number;
          pending_count?: number;
          processed_count?: number;
          processing_count?: number;
          qualified_at?: string | null;
          rls_organization_id?: number | null;
          successful_count?: number;
          total_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_7b0737005e7c358392d87ebb329';
            columns: ['meter_command_batch_id'];
            isOneToOne: false;
            referencedRelation: 'meter_command_batches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meter_command_batch_executions_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      meter_command_batches: {
        Row: {
          author_id: number | null;
          created_at: string;
          fs_command:
            Database['public']['Enums']['fs_command_type_enum'] | null;
          grid_id: number | null;
          hour: number;
          id: number;
          is_deleted: boolean;
          is_repeating: boolean;
          minute: number;
          rls_organization_id: number | null;
          task_type:
            Database['public']['Enums']['meter_interaction_type_enum'] | null;
          updated_at: string | null;
        };
        Insert: {
          author_id?: number | null;
          created_at?: string;
          fs_command?:
            Database['public']['Enums']['fs_command_type_enum'] | null;
          grid_id?: number | null;
          hour: number;
          id?: number;
          is_deleted?: boolean;
          is_repeating?: boolean;
          minute: number;
          rls_organization_id?: number | null;
          task_type?:
            Database['public']['Enums']['meter_interaction_type_enum'] | null;
          updated_at?: string | null;
        };
        Update: {
          author_id?: number | null;
          created_at?: string;
          fs_command?:
            Database['public']['Enums']['fs_command_type_enum'] | null;
          grid_id?: number | null;
          hour?: number;
          id?: number;
          is_deleted?: boolean;
          is_repeating?: boolean;
          minute?: number;
          rls_organization_id?: number | null;
          task_type?:
            Database['public']['Enums']['meter_interaction_type_enum'] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_5c44fae05dc443720f62664e563';
            columns: ['grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_6e26cb6e966f484f0f897127c84';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meter_command_batches_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      meter_commissionings: {
        Row: {
          created_at: string;
          id: number;
          meter_commissioning_status: Database['public']['Enums']['meter_commissioning_status_enum'];
          metering_hardware_install_session_id: number | null;
          rls_organization_id: number | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          meter_commissioning_status?: Database['public']['Enums']['meter_commissioning_status_enum'];
          metering_hardware_install_session_id?: number | null;
          rls_organization_id?: number | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          meter_commissioning_status?: Database['public']['Enums']['meter_commissioning_status_enum'];
          metering_hardware_install_session_id?: number | null;
          rls_organization_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_6684f0790c54ed3d441f78df91a';
            columns: ['metering_hardware_install_session_id'];
            isOneToOne: false;
            referencedRelation: 'metering_hardware_install_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meter_commissionings_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      meter_interactions: {
        Row: {
          batch_execution_id: number | null;
          created_at: string;
          delivery_failure_history: Json | null;
          id: number;
          meter_commissioning_id: number | null;
          meter_id: number;
          meter_interaction_status: Database['public']['Enums']['meter_interaction_status_enum'];
          meter_interaction_type: Database['public']['Enums']['meter_interaction_type_enum'];
          order_id: number | null;
          payload_data: Json | null;
          result_value: Json | null;
          target_power_limit: number | null;
          token: string | null;
          transactive_kwh: number | null;
          updated_at: string;
        };
        Insert: {
          batch_execution_id?: number | null;
          created_at?: string;
          delivery_failure_history?: Json | null;
          id?: number;
          meter_commissioning_id?: number | null;
          meter_id: number;
          meter_interaction_status?: Database['public']['Enums']['meter_interaction_status_enum'];
          meter_interaction_type: Database['public']['Enums']['meter_interaction_type_enum'];
          order_id?: number | null;
          payload_data?: Json | null;
          result_value?: Json | null;
          target_power_limit?: number | null;
          token?: string | null;
          transactive_kwh?: number | null;
          updated_at?: string;
        };
        Update: {
          batch_execution_id?: number | null;
          created_at?: string;
          delivery_failure_history?: Json | null;
          id?: number;
          meter_commissioning_id?: number | null;
          meter_id?: number;
          meter_interaction_status?: Database['public']['Enums']['meter_interaction_status_enum'];
          meter_interaction_type?: Database['public']['Enums']['meter_interaction_type_enum'];
          order_id?: number | null;
          payload_data?: Json | null;
          result_value?: Json | null;
          target_power_limit?: number | null;
          token?: string | null;
          transactive_kwh?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meter_interactions_batch_execution_id_fkey';
            columns: ['batch_execution_id'];
            isOneToOne: false;
            referencedRelation: 'meter_command_batch_executions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meter_interactions_meter_commissioning_id_fkey';
            columns: ['meter_commissioning_id'];
            isOneToOne: false;
            referencedRelation: 'meter_commissionings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meter_interactions_meter_id_fkey';
            columns: ['meter_id'];
            isOneToOne: false;
            referencedRelation: 'meters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meter_interactions_meter_id_fkey';
            columns: ['meter_id'];
            isOneToOne: false;
            referencedRelation: 'meters_with_account_and_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meter_interactions_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: true;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      metering_hardware_imports: {
        Row: {
          created_at: string;
          id: number;
          lock_session: string | null;
          metering_hardware_import_operation: Database['public']['Enums']['mhi_operation_enum'];
          metering_hardware_import_status: Database['public']['Enums']['mhi_status_enum'];
          metering_hardware_install_session_id: number;
          rls_organization_id: number | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          lock_session?: string | null;
          metering_hardware_import_operation?: Database['public']['Enums']['mhi_operation_enum'];
          metering_hardware_import_status?: Database['public']['Enums']['mhi_status_enum'];
          metering_hardware_install_session_id: number;
          rls_organization_id?: number | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          lock_session?: string | null;
          metering_hardware_import_operation?: Database['public']['Enums']['mhi_operation_enum'];
          metering_hardware_import_status?: Database['public']['Enums']['mhi_status_enum'];
          metering_hardware_install_session_id?: number;
          rls_organization_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_5c2bb31b2e45c3f1da0b72071a2';
            columns: ['metering_hardware_install_session_id'];
            isOneToOne: false;
            referencedRelation: 'metering_hardware_install_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'metering_hardware_imports_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      metering_hardware_install_sessions: {
        Row: {
          author_id: number | null;
          created_at: string;
          dcu_id: number | null;
          id: number;
          last_meter_commissioning_id: number | null;
          last_metering_hardware_import_id: number | null;
          meter_id: number | null;
          rls_organization_id: number | null;
        };
        Insert: {
          author_id?: number | null;
          created_at?: string;
          dcu_id?: number | null;
          id?: number;
          last_meter_commissioning_id?: number | null;
          last_metering_hardware_import_id?: number | null;
          meter_id?: number | null;
          rls_organization_id?: number | null;
        };
        Update: {
          author_id?: number | null;
          created_at?: string;
          dcu_id?: number | null;
          id?: number;
          last_meter_commissioning_id?: number | null;
          last_metering_hardware_import_id?: number | null;
          meter_id?: number | null;
          rls_organization_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_35239534a89f0d6dab2612645eb';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_3f770c153b3333ad1d29cfbf784';
            columns: ['meter_id'];
            isOneToOne: false;
            referencedRelation: 'meters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_3f770c153b3333ad1d29cfbf784';
            columns: ['meter_id'];
            isOneToOne: false;
            referencedRelation: 'meters_with_account_and_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_4eb64f5decb7250cfa993410c1e';
            columns: ['last_meter_commissioning_id'];
            isOneToOne: true;
            referencedRelation: 'meter_commissionings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_be64a09dc738420a409cb960264';
            columns: ['last_metering_hardware_import_id'];
            isOneToOne: true;
            referencedRelation: 'metering_hardware_imports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_f3c53f4b922a011aa53d9e0b1ad';
            columns: ['dcu_id'];
            isOneToOne: false;
            referencedRelation: 'dcus';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'metering_hardware_install_sessions_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      meters: {
        Row: {
          balance: number | null;
          balance_updated_at: string | null;
          communication_protocol:
            Database['public']['Enums']['communication_protocol_enum'] | null;
          connection_id: number | null;
          connection_metrics: Json | null;
          coord_accuracy: number;
          created_at: string;
          dcu_id: number | null;
          decoder_key: string | null;
          deleted_at: string | null;
          external_reference: string;
          external_system: Database['public']['Enums']['external_system_enum'];
          id: number;
          is_cabin_meter: boolean;
          is_manual_mode_on: boolean;
          is_manual_mode_on_updated_at: string | null;
          is_on: boolean | null;
          is_on_updated_at: string | null;
          is_starred: boolean;
          is_test_mode_on: boolean;
          issue_check_execution_session: string | null;
          issue_check_last_run_at: string | null;
          kwh_credit_available: number | null;
          kwh_credit_available_updated_at: string | null;
          kwh_tariff: number | null;
          last_encountered_issue_id: number | null;
          last_metering_hardware_install_session_id: number | null;
          last_non_zero_consumption_at: string | null;
          last_seen_at: string | null;
          last_sts_token_issued_at: string | null;
          latitude: number | null;
          longitude: number | null;
          meter_phase: Database['public']['Enums']['meter_phase_enum'];
          meter_type: Database['public']['Enums']['meter_type_enum'];
          nickname: string | null;
          pole_id: number | null;
          power: number | null;
          power_limit: number | null;
          power_limit_hps_mode: number;
          power_limit_should_be: number | null;
          power_limit_should_be_updated_at: string | null;
          power_limit_updated_at: string | null;
          power_updated_at: string | null;
          rls_grid_id: number | null;
          rls_organization_id: number | null;
          should_be_on: boolean | null;
          should_be_on_updated_at: string | null;
          version: string | null;
          voltage: number | null;
          voltage_updated_at: string | null;
        };
        Insert: {
          balance?: number | null;
          balance_updated_at?: string | null;
          communication_protocol?:
            Database['public']['Enums']['communication_protocol_enum'] | null;
          connection_id?: number | null;
          connection_metrics?: Json | null;
          coord_accuracy?: number;
          created_at?: string;
          dcu_id?: number | null;
          decoder_key?: string | null;
          deleted_at?: string | null;
          external_reference: string;
          external_system: Database['public']['Enums']['external_system_enum'];
          id?: number;
          is_cabin_meter?: boolean;
          is_manual_mode_on?: boolean;
          is_manual_mode_on_updated_at?: string | null;
          is_on?: boolean | null;
          is_on_updated_at?: string | null;
          is_starred?: boolean;
          is_test_mode_on?: boolean;
          issue_check_execution_session?: string | null;
          issue_check_last_run_at?: string | null;
          kwh_credit_available?: number | null;
          kwh_credit_available_updated_at?: string | null;
          kwh_tariff?: number | null;
          last_encountered_issue_id?: number | null;
          last_metering_hardware_install_session_id?: number | null;
          last_non_zero_consumption_at?: string | null;
          last_seen_at?: string | null;
          last_sts_token_issued_at?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          meter_phase?: Database['public']['Enums']['meter_phase_enum'];
          meter_type?: Database['public']['Enums']['meter_type_enum'];
          nickname?: string | null;
          pole_id?: number | null;
          power?: number | null;
          power_limit?: number | null;
          power_limit_hps_mode?: number;
          power_limit_should_be?: number | null;
          power_limit_should_be_updated_at?: string | null;
          power_limit_updated_at?: string | null;
          power_updated_at?: string | null;
          rls_grid_id?: number | null;
          rls_organization_id?: number | null;
          should_be_on?: boolean | null;
          should_be_on_updated_at?: string | null;
          version?: string | null;
          voltage?: number | null;
          voltage_updated_at?: string | null;
        };
        Update: {
          balance?: number | null;
          balance_updated_at?: string | null;
          communication_protocol?:
            Database['public']['Enums']['communication_protocol_enum'] | null;
          connection_id?: number | null;
          connection_metrics?: Json | null;
          coord_accuracy?: number;
          created_at?: string;
          dcu_id?: number | null;
          decoder_key?: string | null;
          deleted_at?: string | null;
          external_reference?: string;
          external_system?: Database['public']['Enums']['external_system_enum'];
          id?: number;
          is_cabin_meter?: boolean;
          is_manual_mode_on?: boolean;
          is_manual_mode_on_updated_at?: string | null;
          is_on?: boolean | null;
          is_on_updated_at?: string | null;
          is_starred?: boolean;
          is_test_mode_on?: boolean;
          issue_check_execution_session?: string | null;
          issue_check_last_run_at?: string | null;
          kwh_credit_available?: number | null;
          kwh_credit_available_updated_at?: string | null;
          kwh_tariff?: number | null;
          last_encountered_issue_id?: number | null;
          last_metering_hardware_install_session_id?: number | null;
          last_non_zero_consumption_at?: string | null;
          last_seen_at?: string | null;
          last_sts_token_issued_at?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          meter_phase?: Database['public']['Enums']['meter_phase_enum'];
          meter_type?: Database['public']['Enums']['meter_type_enum'];
          nickname?: string | null;
          pole_id?: number | null;
          power?: number | null;
          power_limit?: number | null;
          power_limit_hps_mode?: number;
          power_limit_should_be?: number | null;
          power_limit_should_be_updated_at?: string | null;
          power_limit_updated_at?: string | null;
          power_updated_at?: string | null;
          rls_grid_id?: number | null;
          rls_organization_id?: number | null;
          should_be_on?: boolean | null;
          should_be_on_updated_at?: string | null;
          version?: string | null;
          voltage?: number | null;
          voltage_updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_04e1a755d5b760f681e5205557d';
            columns: ['dcu_id'];
            isOneToOne: false;
            referencedRelation: 'dcus';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_5606d6ec5ab568377509edc5267';
            columns: ['last_encountered_issue_id'];
            isOneToOne: true;
            referencedRelation: 'issues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_86d4557a79e374b5c55cb3b66d8';
            columns: ['last_metering_hardware_install_session_id'];
            isOneToOne: true;
            referencedRelation: 'metering_hardware_install_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_a11871575f7ddb95e567d842bc6';
            columns: ['pole_id'];
            isOneToOne: false;
            referencedRelation: 'poles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_d281c6e5f391b8de5b221032da6';
            columns: ['connection_id'];
            isOneToOne: false;
            referencedRelation: 'connections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meters_rls_grid_id_fkey';
            columns: ['rls_grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meters_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      mppts: {
        Row: {
          azimuth: number | null;
          created_at: string;
          deleted_at: string | null;
          external_id: string;
          external_reference: string;
          external_system: Database['public']['Enums']['external_system_enum'];
          grid_id: number | null;
          id: number;
          installed_at: string;
          kw: number | null;
          mppt_type: Database['public']['Enums']['mppt_type_enum'];
          rls_organization_id: number | null;
          tilt: number | null;
        };
        Insert: {
          azimuth?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          external_id: string;
          external_reference: string;
          external_system?: Database['public']['Enums']['external_system_enum'];
          grid_id?: number | null;
          id?: number;
          installed_at?: string;
          kw?: number | null;
          mppt_type?: Database['public']['Enums']['mppt_type_enum'];
          rls_organization_id?: number | null;
          tilt?: number | null;
        };
        Update: {
          azimuth?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          external_id?: string;
          external_reference?: string;
          external_system?: Database['public']['Enums']['external_system_enum'];
          grid_id?: number | null;
          id?: number;
          installed_at?: string;
          kw?: number | null;
          mppt_type?: Database['public']['Enums']['mppt_type_enum'];
          rls_organization_id?: number | null;
          tilt?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_0a681c1d6d0a67331bbc6956427';
            columns: ['grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mppts_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      notes: {
        Row: {
          author_id: number | null;
          connection_id: number | null;
          created_at: string;
          customer_id: number | null;
          id: number;
          message: string | null;
          meter_id: number | null;
          rls_organization_id: number | null;
        };
        Insert: {
          author_id?: number | null;
          connection_id?: number | null;
          created_at?: string;
          customer_id?: number | null;
          id?: number;
          message?: string | null;
          meter_id?: number | null;
          rls_organization_id?: number | null;
        };
        Update: {
          author_id?: number | null;
          connection_id?: number | null;
          created_at?: string;
          customer_id?: number | null;
          id?: number;
          message?: string | null;
          meter_id?: number | null;
          rls_organization_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_35b89a50cb9203dccff44136519';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_5ec9536f852f1923097ba1ecdac';
            columns: ['meter_id'];
            isOneToOne: false;
            referencedRelation: 'meters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_5ec9536f852f1923097ba1ecdac';
            columns: ['meter_id'];
            isOneToOne: false;
            referencedRelation: 'meters_with_account_and_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_e04c36c14bc9f01f84cd7655b68';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_e04c36c14bc9f01f84cd7655b68';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers_with_account';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_f1a5ea7b77453030e2a1df27479';
            columns: ['connection_id'];
            isOneToOne: false;
            referencedRelation: 'connections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notes_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_parameters: {
        Row: {
          created_at: string;
          id: number;
          parameters: Json | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          parameters?: Json | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          parameters?: Json | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          account_id: number | null;
          carrier_external_system:
            Database['public']['Enums']['external_system_enum'] | null;
          chat_id: string | null;
          connector_external_system:
            Database['public']['Enums']['external_system_enum'] | null;
          created_at: string;
          email: string | null;
          external_reference: string | null;
          grid_id: number | null;
          id: number;
          lock_session: string | null;
          message: string | null;
          notification_parameter_id: number | null;
          notification_status: Database['public']['Enums']['notification_status_enum'];
          notification_type: Database['public']['Enums']['notification_type_enum'];
          organization_id: number | null;
          phone: string | null;
          subject: string | null;
          thread_id: string | null;
        };
        Insert: {
          account_id?: number | null;
          carrier_external_system?:
            Database['public']['Enums']['external_system_enum'] | null;
          chat_id?: string | null;
          connector_external_system?:
            Database['public']['Enums']['external_system_enum'] | null;
          created_at?: string;
          email?: string | null;
          external_reference?: string | null;
          grid_id?: number | null;
          id?: number;
          lock_session?: string | null;
          message?: string | null;
          notification_parameter_id?: number | null;
          notification_status: Database['public']['Enums']['notification_status_enum'];
          notification_type: Database['public']['Enums']['notification_type_enum'];
          organization_id?: number | null;
          phone?: string | null;
          subject?: string | null;
          thread_id?: string | null;
        };
        Update: {
          account_id?: number | null;
          carrier_external_system?:
            Database['public']['Enums']['external_system_enum'] | null;
          chat_id?: string | null;
          connector_external_system?:
            Database['public']['Enums']['external_system_enum'] | null;
          created_at?: string;
          email?: string | null;
          external_reference?: string | null;
          grid_id?: number | null;
          id?: number;
          lock_session?: string | null;
          message?: string | null;
          notification_parameter_id?: number | null;
          notification_status?: Database['public']['Enums']['notification_status_enum'];
          notification_type?: Database['public']['Enums']['notification_type_enum'];
          organization_id?: number | null;
          phone?: string | null;
          subject?: string | null;
          thread_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_982f77636cb1da8e76745949530';
            columns: ['notification_parameter_id'];
            isOneToOne: false;
            referencedRelation: 'notification_parameters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_a1ec3b4b4f2017665b534e60256';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_c1053eec8005016c7d9febdc484';
            columns: ['grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_cb7b1fb018b296f2107e998b2ff';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          amount: number;
          author_id: number | null;
          created_at: string;
          currency: Database['public']['Enums']['currency_enum'];
          external_reference: string | null;
          historical_grid_id: number | null;
          id: number;
          lock_session: string | null;
          meta_author_id: number | null;
          meta_author_name: string | null;
          meta_author_type:
            Database['public']['Enums']['account_type_enum'] | null;
          meta_is_hidden_from_reporting: boolean | null;
          meta_order_type:
            Database['public']['Enums']['order_type_enum'] | null;
          meta_receiver_id: number | null;
          meta_receiver_id_part_2: number | null;
          meta_receiver_name: string | null;
          meta_receiver_name_part_2: string | null;
          meta_receiver_type:
            Database['public']['Enums']['order_actor_type_enum'] | null;
          meta_sender_id: number | null;
          meta_sender_name: string | null;
          meta_sender_name_part_2: string | null;
          meta_sender_type:
            Database['public']['Enums']['order_actor_type_enum'] | null;
          order_status: Database['public']['Enums']['order_status_enum'];
          payment_channel:
            Database['public']['Enums']['payment_channel_enum'] | null;
          payment_method:
            Database['public']['Enums']['payment_method_enum'] | null;
          receiver_wallet_id: number | null;
          rls_organization_id: number | null;
          sender_wallet_id: number | null;
          tariff: number;
          tariff_type: Database['public']['Enums']['meter_type_enum'] | null;
          updated_at: string;
          ussd_session_id: number | null;
        };
        Insert: {
          amount: number;
          author_id?: number | null;
          created_at?: string;
          currency: Database['public']['Enums']['currency_enum'];
          external_reference?: string | null;
          historical_grid_id?: number | null;
          id?: number;
          lock_session?: string | null;
          meta_author_id?: number | null;
          meta_author_name?: string | null;
          meta_author_type?:
            Database['public']['Enums']['account_type_enum'] | null;
          meta_is_hidden_from_reporting?: boolean | null;
          meta_order_type?:
            Database['public']['Enums']['order_type_enum'] | null;
          meta_receiver_id?: number | null;
          meta_receiver_id_part_2?: number | null;
          meta_receiver_name?: string | null;
          meta_receiver_name_part_2?: string | null;
          meta_receiver_type?:
            Database['public']['Enums']['order_actor_type_enum'] | null;
          meta_sender_id?: number | null;
          meta_sender_name?: string | null;
          meta_sender_name_part_2?: string | null;
          meta_sender_type?:
            Database['public']['Enums']['order_actor_type_enum'] | null;
          order_status?: Database['public']['Enums']['order_status_enum'];
          payment_channel?:
            Database['public']['Enums']['payment_channel_enum'] | null;
          payment_method?:
            Database['public']['Enums']['payment_method_enum'] | null;
          receiver_wallet_id?: number | null;
          rls_organization_id?: number | null;
          sender_wallet_id?: number | null;
          tariff?: number;
          tariff_type?: Database['public']['Enums']['meter_type_enum'] | null;
          updated_at?: string;
          ussd_session_id?: number | null;
        };
        Update: {
          amount?: number;
          author_id?: number | null;
          created_at?: string;
          currency?: Database['public']['Enums']['currency_enum'];
          external_reference?: string | null;
          historical_grid_id?: number | null;
          id?: number;
          lock_session?: string | null;
          meta_author_id?: number | null;
          meta_author_name?: string | null;
          meta_author_type?:
            Database['public']['Enums']['account_type_enum'] | null;
          meta_is_hidden_from_reporting?: boolean | null;
          meta_order_type?:
            Database['public']['Enums']['order_type_enum'] | null;
          meta_receiver_id?: number | null;
          meta_receiver_id_part_2?: number | null;
          meta_receiver_name?: string | null;
          meta_receiver_name_part_2?: string | null;
          meta_receiver_type?:
            Database['public']['Enums']['order_actor_type_enum'] | null;
          meta_sender_id?: number | null;
          meta_sender_name?: string | null;
          meta_sender_name_part_2?: string | null;
          meta_sender_type?:
            Database['public']['Enums']['order_actor_type_enum'] | null;
          order_status?: Database['public']['Enums']['order_status_enum'];
          payment_channel?:
            Database['public']['Enums']['payment_channel_enum'] | null;
          payment_method?:
            Database['public']['Enums']['payment_method_enum'] | null;
          receiver_wallet_id?: number | null;
          rls_organization_id?: number | null;
          sender_wallet_id?: number | null;
          tariff?: number;
          tariff_type?: Database['public']['Enums']['meter_type_enum'] | null;
          updated_at?: string;
          ussd_session_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_0b03d1bc1cff784570333129e63';
            columns: ['historical_grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_576b0e9af0bec469bff33b965aa';
            columns: ['receiver_wallet_id'];
            isOneToOne: false;
            referencedRelation: 'wallets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_60816230893327daacc86ab41c8';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_8f12fe9c7b078122adcae80375d';
            columns: ['sender_wallet_id'];
            isOneToOne: false;
            referencedRelation: 'wallets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_92081072063eaf51300ab6c267d';
            columns: ['ussd_session_id'];
            isOneToOne: true;
            referencedRelation: 'ussd_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          developer_group_telegram_chat_id: string | null;
          email: string | null;
          epicollect_contract_last_sync_at: string | null;
          epicollect_contract_survey_client_id: string | null;
          epicollect_contract_survey_secret: string | null;
          epicollect_contract_survey_slug: string | null;
          formal_name: string | null;
          id: number;
          name: string;
          organization_type: Database['public']['Enums']['organization_type_enum'];
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          developer_group_telegram_chat_id?: string | null;
          email?: string | null;
          epicollect_contract_last_sync_at?: string | null;
          epicollect_contract_survey_client_id?: string | null;
          epicollect_contract_survey_secret?: string | null;
          epicollect_contract_survey_slug?: string | null;
          formal_name?: string | null;
          id?: number;
          name: string;
          organization_type?: Database['public']['Enums']['organization_type_enum'];
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          developer_group_telegram_chat_id?: string | null;
          email?: string | null;
          epicollect_contract_last_sync_at?: string | null;
          epicollect_contract_survey_client_id?: string | null;
          epicollect_contract_survey_secret?: string | null;
          epicollect_contract_survey_slug?: string | null;
          formal_name?: string | null;
          id?: number;
          name?: string;
          organization_type?: Database['public']['Enums']['organization_type_enum'];
        };
        Relationships: [];
      };
      pd_site_submissions: {
        Row: {
          author_email: string;
          author_full_name: string;
          author_organization_id: number | null;
          author_organization_name: string;
          buildings_geo_flat: Json | null;
          created_at: string;
          deleted_at: string | null;
          distribution_geo_flat: Json | null;
          id: number;
          location_geom: unknown;
          meta_geo_flat: Json | null;
          organization_id: number | null;
          outline_geom: unknown;
          poles_geo_flat: Json | null;
          site_details: Json;
          site_name: string;
        };
        Insert: {
          author_email: string;
          author_full_name: string;
          author_organization_id?: number | null;
          author_organization_name: string;
          buildings_geo_flat?: Json | null;
          created_at?: string;
          deleted_at?: string | null;
          distribution_geo_flat?: Json | null;
          id?: number;
          location_geom?: unknown;
          meta_geo_flat?: Json | null;
          organization_id?: number | null;
          outline_geom?: unknown;
          poles_geo_flat?: Json | null;
          site_details: Json;
          site_name: string;
        };
        Update: {
          author_email?: string;
          author_full_name?: string;
          author_organization_id?: number | null;
          author_organization_name?: string;
          buildings_geo_flat?: Json | null;
          created_at?: string;
          deleted_at?: string | null;
          distribution_geo_flat?: Json | null;
          id?: number;
          location_geom?: unknown;
          meta_geo_flat?: Json | null;
          organization_id?: number | null;
          outline_geom?: unknown;
          poles_geo_flat?: Json | null;
          site_details?: Json;
          site_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pd_site_submissions_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      pd_sites: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: number;
          location_geom: unknown;
          name: string;
          operations_grid_id: number | null;
          organization_id: number | null;
          outline_geom: unknown;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: number;
          location_geom?: unknown;
          name: string;
          operations_grid_id?: number | null;
          organization_id?: number | null;
          outline_geom?: unknown;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: number;
          location_geom?: unknown;
          name?: string;
          operations_grid_id?: number | null;
          organization_id?: number | null;
          outline_geom?: unknown;
        };
        Relationships: [
          {
            foreignKeyName: 'pd_sites_operations_grid_id_fkey';
            columns: ['operations_grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pd_sites_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      poles: {
        Row: {
          created_at: string;
          external_reference: string;
          grid_id: number | null;
          id: number;
          is_virtual: boolean;
          location_accuracy: number | null;
          location_geom: unknown;
          nickname: string | null;
          rls_organization_id: number | null;
        };
        Insert: {
          created_at?: string;
          external_reference: string;
          grid_id?: number | null;
          id?: number;
          is_virtual?: boolean;
          location_accuracy?: number | null;
          location_geom: unknown;
          nickname?: string | null;
          rls_organization_id?: number | null;
        };
        Update: {
          created_at?: string;
          external_reference?: string;
          grid_id?: number | null;
          id?: number;
          is_virtual?: boolean;
          location_accuracy?: number | null;
          location_geom?: unknown;
          nickname?: string | null;
          rls_organization_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_2c21d74185234b0dd39588a4d36';
            columns: ['grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'poles_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      routers: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          external_reference: string;
          external_system: Database['public']['Enums']['external_system_enum'];
          grid_id: number | null;
          id: number;
          is_online: boolean;
          is_online_updated_at: string | null;
          rls_organization_id: number | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          external_reference: string;
          external_system?: Database['public']['Enums']['external_system_enum'];
          grid_id?: number | null;
          id?: number;
          is_online?: boolean;
          is_online_updated_at?: string | null;
          rls_organization_id?: number | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          external_reference?: string;
          external_system?: Database['public']['Enums']['external_system_enum'];
          grid_id?: number | null;
          id?: number;
          is_online?: boolean;
          is_online_updated_at?: string | null;
          rls_organization_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_3c3ddc58369a9a8147776e39f40';
            columns: ['grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routers_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      solcast_cache: {
        Row: {
          azimuth: number;
          capacity_kwp: number;
          created_at: string;
          id: number;
          install_date: string;
          latitude: number;
          longitude: number;
          request_type: Database['public']['Enums']['solcast_cache_request_type_enum'];
          response: string;
          tilt: number;
        };
        Insert: {
          azimuth: number;
          capacity_kwp: number;
          created_at?: string;
          id?: number;
          install_date: string;
          latitude: number;
          longitude: number;
          request_type: Database['public']['Enums']['solcast_cache_request_type_enum'];
          response: string;
          tilt: number;
        };
        Update: {
          azimuth?: number;
          capacity_kwp?: number;
          created_at?: string;
          id?: number;
          install_date?: string;
          latitude?: number;
          longitude?: number;
          request_type?: Database['public']['Enums']['solcast_cache_request_type_enum'];
          response?: string;
          tilt?: number;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number;
          balance_after: number;
          balance_before: number;
          created_at: string;
          id: number;
          order_id: number | null;
          rls_organization_id: number | null;
          transaction_status: Database['public']['Enums']['transaction_status_enum'];
          wallet_id: number | null;
        };
        Insert: {
          amount: number;
          balance_after?: number;
          balance_before?: number;
          created_at?: string;
          id?: number;
          order_id?: number | null;
          rls_organization_id?: number | null;
          transaction_status: Database['public']['Enums']['transaction_status_enum'];
          wallet_id?: number | null;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          balance_before?: number;
          created_at?: string;
          id?: number;
          order_id?: number | null;
          rls_organization_id?: number | null;
          transaction_status?: Database['public']['Enums']['transaction_status_enum'];
          wallet_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_0b171330be0cb621f8d73b87a9e';
            columns: ['wallet_id'];
            isOneToOne: false;
            referencedRelation: 'wallets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_3cb0558ed36997f1d9ecc1118e7';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      ussd_session_hops: {
        Row: {
          created_at: string;
          id: number;
          network_code: string | null;
          phone: string | null;
          service_code: string | null;
          text: string | null;
          ussd_session_id: number | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          network_code?: string | null;
          phone?: string | null;
          service_code?: string | null;
          text?: string | null;
          ussd_session_id?: number | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          network_code?: string | null;
          phone?: string | null;
          service_code?: string | null;
          text?: string | null;
          ussd_session_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_bf89299bd6534528adad645b7a5';
            columns: ['ussd_session_id'];
            isOneToOne: false;
            referencedRelation: 'ussd_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      ussd_sessions: {
        Row: {
          account_id: number | null;
          amount: number | null;
          bank_id: number | null;
          created_at: string;
          external_reference: string | null;
          external_system: Database['public']['Enums']['external_system_enum'];
          id: number;
          is_using_other_option: boolean;
          meter_id: number | null;
          phone: string;
        };
        Insert: {
          account_id?: number | null;
          amount?: number | null;
          bank_id?: number | null;
          created_at?: string;
          external_reference?: string | null;
          external_system: Database['public']['Enums']['external_system_enum'];
          id?: number;
          is_using_other_option?: boolean;
          meter_id?: number | null;
          phone: string;
        };
        Update: {
          account_id?: number | null;
          amount?: number | null;
          bank_id?: number | null;
          created_at?: string;
          external_reference?: string | null;
          external_system?: Database['public']['Enums']['external_system_enum'];
          id?: number;
          is_using_other_option?: boolean;
          meter_id?: number | null;
          phone?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_3a2606011b8d9f1de07de2bf0a8';
            columns: ['meter_id'];
            isOneToOne: false;
            referencedRelation: 'meters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_3a2606011b8d9f1de07de2bf0a8';
            columns: ['meter_id'];
            isOneToOne: false;
            referencedRelation: 'meters_with_account_and_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_4cad92626a62976ac0b49244d2e';
            columns: ['bank_id'];
            isOneToOne: false;
            referencedRelation: 'banks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_ede50d58fa445bfa012135249fd';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      wallets: {
        Row: {
          agent_id: number | null;
          balance: number;
          balance_updated_at: string | null;
          connection_id: number | null;
          created_at: string;
          customer_id: number | null;
          id: number;
          identifier: string | null;
          lock_session: string | null;
          meter_id: number | null;
          organization_id: number | null;
          rls_organization_id: number | null;
          wallet_type: Database['public']['Enums']['wallet_type_enum'];
        };
        Insert: {
          agent_id?: number | null;
          balance?: number;
          balance_updated_at?: string | null;
          connection_id?: number | null;
          created_at?: string;
          customer_id?: number | null;
          id?: number;
          identifier?: string | null;
          lock_session?: string | null;
          meter_id?: number | null;
          organization_id?: number | null;
          rls_organization_id?: number | null;
          wallet_type?: Database['public']['Enums']['wallet_type_enum'];
        };
        Update: {
          agent_id?: number | null;
          balance?: number;
          balance_updated_at?: string | null;
          connection_id?: number | null;
          created_at?: string;
          customer_id?: number | null;
          id?: number;
          identifier?: string | null;
          lock_session?: string | null;
          meter_id?: number | null;
          organization_id?: number | null;
          rls_organization_id?: number | null;
          wallet_type?: Database['public']['Enums']['wallet_type_enum'];
        };
        Relationships: [
          {
            foreignKeyName: 'FK_6580899a2293de27787376887fa';
            columns: ['customer_id'];
            isOneToOne: true;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_6580899a2293de27787376887fa';
            columns: ['customer_id'];
            isOneToOne: true;
            referencedRelation: 'customers_with_account';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_8db1f4e4f8122bd25d50ad96b26';
            columns: ['meter_id'];
            isOneToOne: true;
            referencedRelation: 'meters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_8db1f4e4f8122bd25d50ad96b26';
            columns: ['meter_id'];
            isOneToOne: true;
            referencedRelation: 'meters_with_account_and_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_e63e504d8e35ef37a2c56b75eb9';
            columns: ['connection_id'];
            isOneToOne: true;
            referencedRelation: 'connections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_f499c61c6d6a0ac3f794d966edc';
            columns: ['organization_id'];
            isOneToOne: true;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_f5782e05e8688f0cfbb5c4a52ce';
            columns: ['agent_id'];
            isOneToOne: true;
            referencedRelation: 'agents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_f5782e05e8688f0cfbb5c4a52ce';
            columns: ['agent_id'];
            isOneToOne: true;
            referencedRelation: 'agents_with_account';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallets_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      agents_with_account: {
        Row: {
          account_id: number | null;
          created_at: string | null;
          deleted_at: string | null;
          full_name: string | null;
          grid_id: number | null;
          id: number | null;
          phone: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_9bb7cb7efc780ec4d3dec34354f';
            columns: ['grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_df520decc9e003a843d8edd9867';
            columns: ['account_id'];
            isOneToOne: true;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      customers_with_account: {
        Row: {
          account_id: number | null;
          created_at: string | null;
          deleted_at: string | null;
          full_name: string | null;
          gender: Database['public']['Enums']['gender_enum'] | null;
          generator_owned:
            Database['public']['Enums']['generator_type_enum'] | null;
          grid_id: number | null;
          has_fully_paid_connection_fees: boolean | null;
          id: number | null;
          is_hidden_from_reporting: boolean | null;
          latitude: number | null;
          lives_primarily_in_the_community: boolean | null;
          longitude: number | null;
          meter: string | null;
          phone: string | null;
          total_connection_fee: number | null;
          total_connection_paid: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_51a88ee1d4fceb047e7cfda3baa';
            columns: ['grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_ebcc29963874e55053e8ee80be5';
            columns: ['account_id'];
            isOneToOne: true;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      meters_with_account_and_statuses: {
        Row: {
          balance: number | null;
          balance_updated_at: string | null;
          communication_protocol:
            Database['public']['Enums']['communication_protocol_enum'] | null;
          connection_id: number | null;
          coord_accuracy: number | null;
          created_at: string | null;
          dcu_id: number | null;
          decoder_key: string | null;
          deleted_at: string | null;
          external_reference: string | null;
          external_system:
            Database['public']['Enums']['external_system_enum'] | null;
          full_name: string | null;
          grid_id: number | null;
          id: number | null;
          install_status: Database['public']['Enums']['mhi_status_enum'] | null;
          is_cabin_meter: boolean | null;
          is_hidden_from_reporting: boolean | null;
          is_manual_mode_on: boolean | null;
          is_manual_mode_on_updated_at: string | null;
          is_on: boolean | null;
          is_on_updated_at: string | null;
          is_starred: boolean | null;
          is_test_mode_on: boolean | null;
          issue_check_execution_session: string | null;
          issue_check_last_run_at: string | null;
          kwh_credit_available: number | null;
          kwh_credit_available_updated_at: string | null;
          kwh_tariff: number | null;
          last_encountered_issue_id: number | null;
          last_metering_hardware_install_session_id: number | null;
          last_non_zero_consumption_at: string | null;
          last_seen_at: string | null;
          last_sts_token_issued_at: string | null;
          latitude: number | null;
          longitude: number | null;
          meter_phase: Database['public']['Enums']['meter_phase_enum'] | null;
          meter_type: Database['public']['Enums']['meter_type_enum'] | null;
          nickname: string | null;
          open_issue: Database['public']['Enums']['issue_type_enum'] | null;
          phone: string | null;
          pole_id: number | null;
          power: number | null;
          power_limit: number | null;
          power_limit_hps_mode: number | null;
          power_limit_should_be: number | null;
          power_limit_should_be_updated_at: string | null;
          power_limit_updated_at: string | null;
          power_updated_at: string | null;
          rls_grid_id: number | null;
          rls_organization_id: number | null;
          should_be_on: boolean | null;
          should_be_on_updated_at: string | null;
          version: string | null;
          voltage: number | null;
          voltage_updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'FK_04e1a755d5b760f681e5205557d';
            columns: ['dcu_id'];
            isOneToOne: false;
            referencedRelation: 'dcus';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_51a88ee1d4fceb047e7cfda3baa';
            columns: ['grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_5606d6ec5ab568377509edc5267';
            columns: ['last_encountered_issue_id'];
            isOneToOne: true;
            referencedRelation: 'issues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_86d4557a79e374b5c55cb3b66d8';
            columns: ['last_metering_hardware_install_session_id'];
            isOneToOne: true;
            referencedRelation: 'metering_hardware_install_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_a11871575f7ddb95e567d842bc6';
            columns: ['pole_id'];
            isOneToOne: false;
            referencedRelation: 'poles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'FK_d281c6e5f391b8de5b221032da6';
            columns: ['connection_id'];
            isOneToOne: false;
            referencedRelation: 'connections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meters_rls_grid_id_fkey';
            columns: ['rls_grid_id'];
            isOneToOne: false;
            referencedRelation: 'grids';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meters_rls_organization_id_fkey';
            columns: ['rls_organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      find_energy_topup_revenue: {
        Args: { end_date: string; grid_id: number; start_date: string };
        Returns: number;
      };
      find_top_spenders: {
        Args: {
          end_date: string;
          grid_id: number;
          limit_count: number;
          start_date: string;
        };
        Returns: {
          amount: number;
          full_name: string;
          id: number;
        }[];
      };
      get_grid_status: {
        Args: { grid_id: number };
        Returns: {
          customer_count: number;
          is_cabin_meter_credit_depleting: boolean;
          is_fs_on: boolean;
          is_hps_on: boolean;
        }[];
      };
      lock_next_order_and_wallets: {
        Args: { uuid: string };
        Returns: {
          id: number;
        }[];
      };
      rls_check_if_admin_org_member: { Args: never; Returns: boolean };
      rls_check_if_lender: { Args: never; Returns: boolean };
      rls_get_member_org_id: { Args: never; Returns: number };
      rls_org_id_from_agent: { Args: { agent_id: number }; Returns: number };
      rls_org_id_from_connection: {
        Args: { connection_id: number };
        Returns: number;
      };
      rls_org_id_from_customer: {
        Args: { customer_id: number };
        Returns: number;
      };
      rls_org_id_from_dcu: { Args: { dcu_id: number }; Returns: number };
      rls_org_id_from_grid: { Args: { grid_id: number }; Returns: number };
      rls_org_id_from_meter: { Args: { meter_id: number }; Returns: number };
    };
    Enums: {
      account_type_enum: 'AGENT' | 'MEMBER' | 'CUSTOMER';
      communication_protocol_enum: 'CALIN_V1' | 'CALIN_V2' | 'CALIN_LORAWAN';
      currency_enum: 'USD' | 'NGN' | 'EUR';
      external_system_enum:
        | 'CALIN'
        | 'SOLCAST'
        | 'VICTRON'
        | 'FLUTTERWAVE'
        | 'AFRICASTALKING'
        | 'EPICOLLECT'
        | 'JIRA'
        | 'TELEGRAM'
        | 'ZEROTIER'
        | 'MAKE'
        | 'FLOW_XO'
        | 'SENDGRID';
      fs_command_type_enum: 'ON' | 'OFF';
      gender_enum: 'MALE' | 'FEMALE';
      generator_type_enum: 'SMALL' | 'LARGE';
      id_document_type_enum:
        'PASSPORT' | 'NATIONAL_ID' | 'DRIVING_LICENSE' | 'VOTERS_CARD';
      issue_status_enum: 'OPEN' | 'CLOSED' | 'OVERRIDDEN';
      issue_type_enum:
        | 'NO_COMMUNICATION'
        | 'METER_NOT_ACTIVATED'
        | 'TAMPER'
        | 'POWER_LIMIT_BREACHED'
        | 'OVER_VOLTAGE'
        | 'LOW_VOLTAGE'
        | 'POWER_LIMIT_BAD_CONFIGURATION'
        | 'METER_STATE_BAD_CONFIGURATION'
        | 'UNEXPECTED_POWER_LIMIT'
        | 'UNEXPECTED_METER_STATUS'
        | 'NO_CREDIT'
        | 'NO_CONSUMPTION'
        | 'NUMBER_OF_PHASES'
        | 'VEBUS_STATE'
        | 'VEBUS_ERROR'
        | 'QUATTRO_TEMPERATURE_ALARM'
        | 'QUATTRO_OVERLOAD_ALARM'
        | 'HIGH_BATTERY_TEMPERATURE_ALARM'
        | 'CELL_IMBALANCE_ALARM'
        | 'HIGH_CHARGE_CURRENT_ALARM'
        | 'HIGH_CHARGE_TEMPERATURE_ALARM'
        | 'BATTERY_INTERNAL_FAILURE'
        | 'BATTERY_CHARGE_BLOCKED_ALARM'
        | 'BATTERY_DISCHARGE_BLOCKED_ALARM';
      member_type_enum:
        | 'SUPERADMIN'
        | 'ADMIN'
        | 'PARTNER'
        | 'FINANCE'
        | 'DEVELOPER'
        | 'MANAGER'
        | 'SUPPORT'
        | 'SERVICE'
        | 'SALES'
        | 'TECH';
      meter_commissioning_status_enum:
        'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED';
      meter_interaction_status_enum:
        | 'QUEUED'
        | 'ABORTED'
        | 'PROCESSING'
        | 'SUCCESSFUL'
        | 'FAILED'
        | 'DEFERRED'
        | 'SUSPENDED';
      meter_interaction_type_enum:
        | 'READ_CREDIT'
        | 'READ_POWER_LIMIT'
        | 'READ_VOLTAGE'
        | 'SET_POWER_LIMIT'
        | 'TOP_UP'
        | 'TURN_ON'
        | 'TURN_OFF'
        | 'READ_POWER'
        | 'READ_CURRENT'
        | 'CLEAR_CREDIT'
        | 'CLEAR_TAMPER'
        | 'READ_REPORT'
        | 'JOIN_NETWORK'
        | 'DELIVER_PREEXISTING_TOKEN'
        | 'READ_VERSION'
        | 'READ_DATE'
        | 'SET_DATE'
        | 'READ_TIME'
        | 'SET_TIME';
      meter_phase_enum: 'SINGLE_PHASE' | 'THREE_PHASE';
      meter_type_enum: 'HPS' | 'FS';
      mhi_operation_enum: 'ADD' | 'REMOVE';
      mhi_status_enum: 'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED';
      mppt_type_enum: 'MPPT' | 'PV_INVERTER';
      notification_status_enum:
        | 'PENDING'
        | 'PROCESSING'
        | 'RECEIVED_BY_API'
        | 'FAILED'
        | 'SUCCESSFUL'
        | 'READ'
        | 'UNKNOWN';
      notification_type_enum:
        | 'GRID_IS_HPS_ON_STATE_CHANGE'
        | 'GRID_IS_FS_ON_STATE_CHANGE'
        | 'GRID_METERING_HARDWARE_STATE_CHANGE'
        | 'FS_RULE_EXECUTION_COMING_UP'
        | 'FS_RULE_CHANGED'
        | 'TARIFF_RULE_CHANGED'
        | 'CLEAN_PANELS_REMINDER'
        | 'GRID_REVENUE'
        | 'PASSWORD_RESET'
        | 'INVITE'
        | 'CREDIT_SENT'
        | 'CREDIT_RECEIVED'
        | 'METER_TOPPED_UP'
        | 'PAYMENT_REJECTED'
        | 'SITE_SUBMISSION';
      order_actor_type_enum:
        | 'BANKING_SYSTEM'
        | 'ORGANIZATION'
        | 'CONNECTION'
        | 'METER'
        | 'AGENT'
        | 'CUSTOMER';
      order_status_enum:
        | 'INITIALISED'
        | 'PENDING'
        | 'COMPLETED'
        | 'FAILED'
        | 'CANCELLED'
        | 'TIMED_OUT'
        | 'IGNORED';
      order_type_enum:
        | 'ENERGY_TOPUP'
        | 'CONNECTION_PAYMENT'
        | 'CONNECTION_REFUND'
        | 'AGENT_WITHDRAWAL'
        | 'AGENT_TOPUP'
        | 'ORGANIZATION_TOPUP'
        | 'ORGANIZATION_WITHDRAWAL'
        | 'CUSTOMER_TOPUP';
      organization_type_enum:
        'SOLAR_DEVELOPER' | 'LENDER' | 'DATA_AGGREGATOR' | 'PLATFORM_OPERATOR';
      payment_channel_enum: 'USSD' | 'AYRTON' | 'NIFFLER' | 'TELEGRAM';
      payment_method_enum: 'CREDIT_CARD' | 'USSD' | 'BANK_TRANSFER';
      solcast_cache_request_type_enum: 'ESTIMATED_ACTUALS' | 'FORECAST';
      transaction_status_enum: 'SUCCESSFUL' | 'FAILED';
      wallet_type_enum: 'VIRTUAL' | 'REAL';
      weather_type_enum:
        | 'CLOUDY'
        | 'CLOUDS'
        | 'SHOWERS'
        | 'SUNNY'
        | 'UNKNOWN'
        | 'CLOUDY_WITH_RAIN';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_type_enum: [ 'AGENT', 'MEMBER', 'CUSTOMER' ],
      communication_protocol_enum: [ 'CALIN_V1', 'CALIN_V2', 'CALIN_LORAWAN' ],
      currency_enum: [ 'USD', 'NGN', 'EUR' ],
      external_system_enum: [
        'CALIN',
        'SOLCAST',
        'VICTRON',
        'FLUTTERWAVE',
        'AFRICASTALKING',
        'EPICOLLECT',
        'JIRA',
        'TELEGRAM',
        'ZEROTIER',
        'MAKE',
        'FLOW_XO',
        'SENDGRID',
      ],
      fs_command_type_enum: [ 'ON', 'OFF' ],
      gender_enum: [ 'MALE', 'FEMALE' ],
      generator_type_enum: [ 'SMALL', 'LARGE' ],
      id_document_type_enum: [
        'PASSPORT',
        'NATIONAL_ID',
        'DRIVING_LICENSE',
        'VOTERS_CARD',
      ],
      issue_status_enum: [ 'OPEN', 'CLOSED', 'OVERRIDDEN' ],
      issue_type_enum: [
        'NO_COMMUNICATION',
        'METER_NOT_ACTIVATED',
        'TAMPER',
        'POWER_LIMIT_BREACHED',
        'OVER_VOLTAGE',
        'LOW_VOLTAGE',
        'POWER_LIMIT_BAD_CONFIGURATION',
        'METER_STATE_BAD_CONFIGURATION',
        'UNEXPECTED_POWER_LIMIT',
        'UNEXPECTED_METER_STATUS',
        'NO_CREDIT',
        'NO_CONSUMPTION',
        'NUMBER_OF_PHASES',
        'VEBUS_STATE',
        'VEBUS_ERROR',
        'QUATTRO_TEMPERATURE_ALARM',
        'QUATTRO_OVERLOAD_ALARM',
        'HIGH_BATTERY_TEMPERATURE_ALARM',
        'CELL_IMBALANCE_ALARM',
        'HIGH_CHARGE_CURRENT_ALARM',
        'HIGH_CHARGE_TEMPERATURE_ALARM',
        'BATTERY_INTERNAL_FAILURE',
        'BATTERY_CHARGE_BLOCKED_ALARM',
        'BATTERY_DISCHARGE_BLOCKED_ALARM',
      ],
      member_type_enum: [
        'SUPERADMIN',
        'ADMIN',
        'PARTNER',
        'FINANCE',
        'DEVELOPER',
        'MANAGER',
        'SUPPORT',
        'SERVICE',
        'SALES',
        'TECH',
      ],
      meter_commissioning_status_enum: [
        'PENDING',
        'PROCESSING',
        'SUCCESSFUL',
        'FAILED',
      ],
      meter_interaction_status_enum: [
        'QUEUED',
        'ABORTED',
        'PROCESSING',
        'SUCCESSFUL',
        'FAILED',
        'DEFERRED',
        'SUSPENDED',
      ],
      meter_interaction_type_enum: [
        'READ_CREDIT',
        'READ_POWER_LIMIT',
        'READ_VOLTAGE',
        'SET_POWER_LIMIT',
        'TOP_UP',
        'TURN_ON',
        'TURN_OFF',
        'READ_POWER',
        'READ_CURRENT',
        'CLEAR_CREDIT',
        'CLEAR_TAMPER',
        'READ_REPORT',
        'JOIN_NETWORK',
        'DELIVER_PREEXISTING_TOKEN',
        'READ_VERSION',
        'READ_DATE',
        'SET_DATE',
        'READ_TIME',
        'SET_TIME',
      ],
      meter_phase_enum: [ 'SINGLE_PHASE', 'THREE_PHASE' ],
      meter_type_enum: [ 'HPS', 'FS' ],
      mhi_operation_enum: [ 'ADD', 'REMOVE' ],
      mhi_status_enum: [ 'PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED' ],
      mppt_type_enum: [ 'MPPT', 'PV_INVERTER' ],
      notification_status_enum: [
        'PENDING',
        'PROCESSING',
        'RECEIVED_BY_API',
        'FAILED',
        'SUCCESSFUL',
        'READ',
        'UNKNOWN',
      ],
      notification_type_enum: [
        'GRID_IS_HPS_ON_STATE_CHANGE',
        'GRID_IS_FS_ON_STATE_CHANGE',
        'GRID_METERING_HARDWARE_STATE_CHANGE',
        'FS_RULE_EXECUTION_COMING_UP',
        'FS_RULE_CHANGED',
        'TARIFF_RULE_CHANGED',
        'CLEAN_PANELS_REMINDER',
        'GRID_REVENUE',
        'PASSWORD_RESET',
        'INVITE',
        'CREDIT_SENT',
        'CREDIT_RECEIVED',
        'METER_TOPPED_UP',
        'PAYMENT_REJECTED',
        'SITE_SUBMISSION',
      ],
      order_actor_type_enum: [
        'BANKING_SYSTEM',
        'ORGANIZATION',
        'CONNECTION',
        'METER',
        'AGENT',
        'CUSTOMER',
      ],
      order_status_enum: [
        'INITIALISED',
        'PENDING',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
        'TIMED_OUT',
        'IGNORED',
      ],
      order_type_enum: [
        'ENERGY_TOPUP',
        'CONNECTION_PAYMENT',
        'CONNECTION_REFUND',
        'AGENT_WITHDRAWAL',
        'AGENT_TOPUP',
        'ORGANIZATION_TOPUP',
        'ORGANIZATION_WITHDRAWAL',
        'CUSTOMER_TOPUP',
      ],
      organization_type_enum: [
        'SOLAR_DEVELOPER',
        'LENDER',
        'DATA_AGGREGATOR',
        'PLATFORM_OPERATOR',
      ],
      payment_channel_enum: [ 'USSD', 'AYRTON', 'NIFFLER', 'TELEGRAM' ],
      payment_method_enum: [ 'CREDIT_CARD', 'USSD', 'BANK_TRANSFER' ],
      solcast_cache_request_type_enum: [ 'ESTIMATED_ACTUALS', 'FORECAST' ],
      transaction_status_enum: [ 'SUCCESSFUL', 'FAILED' ],
      wallet_type_enum: [ 'VIRTUAL', 'REAL' ],
      weather_type_enum: [
        'CLOUDY',
        'CLOUDS',
        'SHOWERS',
        'SUNNY',
        'UNKNOWN',
        'CLOUDY_WITH_RAIN',
      ],
    },
  },
} as const;

// Schema: public
// Enums
export type AccountTypeEnum = Database['public']['Enums']['account_type_enum'];

export type CommunicationProtocolEnum =
  Database['public']['Enums']['communication_protocol_enum'];

export type CurrencyEnum = Database['public']['Enums']['currency_enum'];

export type ExternalSystemEnum =
  Database['public']['Enums']['external_system_enum'];

export type FCommandTypeEnum =
  Database['public']['Enums']['fs_command_type_enum'];

export type GenderEnum = Database['public']['Enums']['gender_enum'];

export type GeneratorTypeEnum =
  Database['public']['Enums']['generator_type_enum'];

export type IdDocumentTypeEnum =
  Database['public']['Enums']['id_document_type_enum'];

export type IssueStatusEnum = Database['public']['Enums']['issue_status_enum'];

export type IssueTypeEnum = Database['public']['Enums']['issue_type_enum'];

export type MemberTypeEnum = Database['public']['Enums']['member_type_enum'];

export type MeterCommissioningStatusEnum =
  Database['public']['Enums']['meter_commissioning_status_enum'];

export type MeterInteractionStatusEnum =
  Database['public']['Enums']['meter_interaction_status_enum'];

export type MeterInteractionTypeEnum =
  Database['public']['Enums']['meter_interaction_type_enum'];

export type MeterPhaseEnum = Database['public']['Enums']['meter_phase_enum'];

export type MeterTypeEnum = Database['public']['Enums']['meter_type_enum'];

export type MhiOperationEnum =
  Database['public']['Enums']['mhi_operation_enum'];

export type MhiStatusEnum = Database['public']['Enums']['mhi_status_enum'];

export type MpptTypeEnum = Database['public']['Enums']['mppt_type_enum'];

export type NotificationStatusEnum =
  Database['public']['Enums']['notification_status_enum'];

export type NotificationTypeEnum =
  Database['public']['Enums']['notification_type_enum'];

export type OrderActorTypeEnum =
  Database['public']['Enums']['order_actor_type_enum'];

export type OrderStatusEnum = Database['public']['Enums']['order_status_enum'];

export type OrderTypeEnum = Database['public']['Enums']['order_type_enum'];

export type OrganizationTypeEnum =
  Database['public']['Enums']['organization_type_enum'];

export type PaymentChannelEnum =
  Database['public']['Enums']['payment_channel_enum'];

export type PaymentMethodEnum =
  Database['public']['Enums']['payment_method_enum'];

export type SolcastCacheRequestTypeEnum =
  Database['public']['Enums']['solcast_cache_request_type_enum'];

export type TransactionStatusEnum =
  Database['public']['Enums']['transaction_status_enum'];

export type WalletTypeEnum = Database['public']['Enums']['wallet_type_enum'];

export type WeatherTypeEnum = Database['public']['Enums']['weather_type_enum'];

// Tables
export type Account = Database['public']['Tables']['accounts']['Row'];
export type InsertAccount = Database['public']['Tables']['accounts']['Insert'];
export type UpdateAccount = Database['public']['Tables']['accounts']['Update'];

export type Agent = Database['public']['Tables']['agents']['Row'];
export type InsertAgent = Database['public']['Tables']['agents']['Insert'];
export type UpdateAgent = Database['public']['Tables']['agents']['Update'];

export type ApiKey = Database['public']['Tables']['api_keys']['Row'];
export type InsertApiKey = Database['public']['Tables']['api_keys']['Insert'];
export type UpdateApiKey = Database['public']['Tables']['api_keys']['Update'];

export type Audit = Database['public']['Tables']['audits']['Row'];
export type InsertAudit = Database['public']['Tables']['audits']['Insert'];
export type UpdateAudit = Database['public']['Tables']['audits']['Update'];

export type Bank = Database['public']['Tables']['banks']['Row'];
export type InsertBank = Database['public']['Tables']['banks']['Insert'];
export type UpdateBank = Database['public']['Tables']['banks']['Update'];

export type ConnectionRequestedMeter =
  Database['public']['Tables']['connection_requested_meters']['Row'];
export type InsertConnectionRequestedMeter =
  Database['public']['Tables']['connection_requested_meters']['Insert'];
export type UpdateConnectionRequestedMeter =
  Database['public']['Tables']['connection_requested_meters']['Update'];

export type Connection = Database['public']['Tables']['connections']['Row'];
export type InsertConnection =
  Database['public']['Tables']['connections']['Insert'];
export type UpdateConnection =
  Database['public']['Tables']['connections']['Update'];

export type Customer = Database['public']['Tables']['customers']['Row'];
export type InsertCustomer =
  Database['public']['Tables']['customers']['Insert'];
export type UpdateCustomer =
  Database['public']['Tables']['customers']['Update'];

export type Dcus = Database['public']['Tables']['dcus']['Row'];
export type InsertDcus = Database['public']['Tables']['dcus']['Insert'];
export type UpdateDcus = Database['public']['Tables']['dcus']['Update'];

export type EnergyCabin = Database['public']['Tables']['energy_cabins']['Row'];
export type InsertEnergyCabin =
  Database['public']['Tables']['energy_cabins']['Insert'];
export type UpdateEnergyCabin =
  Database['public']['Tables']['energy_cabins']['Update'];

export type Grid = Database['public']['Tables']['grids']['Row'];
export type InsertGrid = Database['public']['Tables']['grids']['Insert'];
export type UpdateGrid = Database['public']['Tables']['grids']['Update'];

export type Issue = Database['public']['Tables']['issues']['Row'];
export type InsertIssue = Database['public']['Tables']['issues']['Insert'];
export type UpdateIssue = Database['public']['Tables']['issues']['Update'];

export type Member = Database['public']['Tables']['members']['Row'];
export type InsertMember = Database['public']['Tables']['members']['Insert'];
export type UpdateMember = Database['public']['Tables']['members']['Update'];

export type MeterCommandBatchExecution =
  Database['public']['Tables']['meter_command_batch_executions']['Row'];
export type InsertMeterCommandBatchExecution =
  Database['public']['Tables']['meter_command_batch_executions']['Insert'];
export type UpdateMeterCommandBatchExecution =
  Database['public']['Tables']['meter_command_batch_executions']['Update'];

export type MeterCommandBatch =
  Database['public']['Tables']['meter_command_batches']['Row'];
export type InsertMeterCommandBatch =
  Database['public']['Tables']['meter_command_batches']['Insert'];
export type UpdateMeterCommandBatch =
  Database['public']['Tables']['meter_command_batches']['Update'];

export type MeterCommissioning =
  Database['public']['Tables']['meter_commissionings']['Row'];
export type InsertMeterCommissioning =
  Database['public']['Tables']['meter_commissionings']['Insert'];
export type UpdateMeterCommissioning =
  Database['public']['Tables']['meter_commissionings']['Update'];

export type MeterInteraction =
  Database['public']['Tables']['meter_interactions']['Row'];
export type InsertMeterInteraction =
  Database['public']['Tables']['meter_interactions']['Insert'];
export type UpdateMeterInteraction =
  Database['public']['Tables']['meter_interactions']['Update'];

export type MeteringHardwareImport =
  Database['public']['Tables']['metering_hardware_imports']['Row'];
export type InsertMeteringHardwareImport =
  Database['public']['Tables']['metering_hardware_imports']['Insert'];
export type UpdateMeteringHardwareImport =
  Database['public']['Tables']['metering_hardware_imports']['Update'];

export type MeteringHardwareInstallSession =
  Database['public']['Tables']['metering_hardware_install_sessions']['Row'];
export type InsertMeteringHardwareInstallSession =
  Database['public']['Tables']['metering_hardware_install_sessions']['Insert'];
export type UpdateMeteringHardwareInstallSession =
  Database['public']['Tables']['metering_hardware_install_sessions']['Update'];

export type Meter = Database['public']['Tables']['meters']['Row'];
export type InsertMeter = Database['public']['Tables']['meters']['Insert'];
export type UpdateMeter = Database['public']['Tables']['meters']['Update'];

export type Mppt = Database['public']['Tables']['mppts']['Row'];
export type InsertMppt = Database['public']['Tables']['mppts']['Insert'];
export type UpdateMppt = Database['public']['Tables']['mppts']['Update'];

export type Note = Database['public']['Tables']['notes']['Row'];
export type InsertNote = Database['public']['Tables']['notes']['Insert'];
export type UpdateNote = Database['public']['Tables']['notes']['Update'];

export type NotificationParameter =
  Database['public']['Tables']['notification_parameters']['Row'];
export type InsertNotificationParameter =
  Database['public']['Tables']['notification_parameters']['Insert'];
export type UpdateNotificationParameter =
  Database['public']['Tables']['notification_parameters']['Update'];

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type InsertNotification =
  Database['public']['Tables']['notifications']['Insert'];
export type UpdateNotification =
  Database['public']['Tables']['notifications']['Update'];

export type Order = Database['public']['Tables']['orders']['Row'];
export type InsertOrder = Database['public']['Tables']['orders']['Insert'];
export type UpdateOrder = Database['public']['Tables']['orders']['Update'];

export type Organization = Database['public']['Tables']['organizations']['Row'];
export type InsertOrganization =
  Database['public']['Tables']['organizations']['Insert'];
export type UpdateOrganization =
  Database['public']['Tables']['organizations']['Update'];

export type PdSiteSubmission =
  Database['public']['Tables']['pd_site_submissions']['Row'];
export type InsertPdSiteSubmission =
  Database['public']['Tables']['pd_site_submissions']['Insert'];
export type UpdatePdSiteSubmission =
  Database['public']['Tables']['pd_site_submissions']['Update'];

export type PdSite = Database['public']['Tables']['pd_sites']['Row'];
export type InsertPdSite = Database['public']['Tables']['pd_sites']['Insert'];
export type UpdatePdSite = Database['public']['Tables']['pd_sites']['Update'];

export type Pole = Database['public']['Tables']['poles']['Row'];
export type InsertPole = Database['public']['Tables']['poles']['Insert'];
export type UpdatePole = Database['public']['Tables']['poles']['Update'];

export type Router = Database['public']['Tables']['routers']['Row'];
export type InsertRouter = Database['public']['Tables']['routers']['Insert'];
export type UpdateRouter = Database['public']['Tables']['routers']['Update'];

export type SolcastCache = Database['public']['Tables']['solcast_cache']['Row'];
export type InsertSolcastCache =
  Database['public']['Tables']['solcast_cache']['Insert'];
export type UpdateSolcastCache =
  Database['public']['Tables']['solcast_cache']['Update'];

export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type InsertTransaction =
  Database['public']['Tables']['transactions']['Insert'];
export type UpdateTransaction =
  Database['public']['Tables']['transactions']['Update'];

export type UssdSessionHop =
  Database['public']['Tables']['ussd_session_hops']['Row'];
export type InsertUssdSessionHop =
  Database['public']['Tables']['ussd_session_hops']['Insert'];
export type UpdateUssdSessionHop =
  Database['public']['Tables']['ussd_session_hops']['Update'];

export type UssdSession = Database['public']['Tables']['ussd_sessions']['Row'];
export type InsertUssdSession =
  Database['public']['Tables']['ussd_sessions']['Insert'];
export type UpdateUssdSession =
  Database['public']['Tables']['ussd_sessions']['Update'];

export type Wallet = Database['public']['Tables']['wallets']['Row'];
export type InsertWallet = Database['public']['Tables']['wallets']['Insert'];
export type UpdateWallet = Database['public']['Tables']['wallets']['Update'];

// Views
export type AgentWithAccount =
  Database['public']['Views']['agents_with_account']['Row'];

export type CustomerWithAccount =
  Database['public']['Views']['customers_with_account']['Row'];

export type MeterWithAccountAndStatus =
  Database['public']['Views']['meters_with_account_and_statuses']['Row'];

// Functions
export type ArgsFindEnergyTopupRevenue =
  Database['public']['Functions']['find_energy_topup_revenue']['Args'];
export type ReturnTypeFindEnergyTopupRevenue =
  Database['public']['Functions']['find_energy_topup_revenue']['Returns'];

export type ArgsFindTopSpender =
  Database['public']['Functions']['find_top_spenders']['Args'];
export type ReturnTypeFindTopSpender =
  Database['public']['Functions']['find_top_spenders']['Returns'];

export type ArgsGetGridStatus =
  Database['public']['Functions']['get_grid_status']['Args'];
export type ReturnTypeGetGridStatus =
  Database['public']['Functions']['get_grid_status']['Returns'];

export type ArgsLockNextOrderAndWallet =
  Database['public']['Functions']['lock_next_order_and_wallets']['Args'];
export type ReturnTypeLockNextOrderAndWallet =
  Database['public']['Functions']['lock_next_order_and_wallets']['Returns'];

export type ArgsRlCheckIfAdminOrgMember =
  Database['public']['Functions']['rls_check_if_admin_org_member']['Args'];
export type ReturnTypeRlCheckIfAdminOrgMember =
  Database['public']['Functions']['rls_check_if_admin_org_member']['Returns'];

export type ArgsRlCheckIfLender =
  Database['public']['Functions']['rls_check_if_lender']['Args'];
export type ReturnTypeRlCheckIfLender =
  Database['public']['Functions']['rls_check_if_lender']['Returns'];

export type ArgsRlGetMemberOrgId =
  Database['public']['Functions']['rls_get_member_org_id']['Args'];
export type ReturnTypeRlGetMemberOrgId =
  Database['public']['Functions']['rls_get_member_org_id']['Returns'];

export type ArgsRlOrgIdFromAgent =
  Database['public']['Functions']['rls_org_id_from_agent']['Args'];
export type ReturnTypeRlOrgIdFromAgent =
  Database['public']['Functions']['rls_org_id_from_agent']['Returns'];

export type ArgsRlOrgIdFromConnection =
  Database['public']['Functions']['rls_org_id_from_connection']['Args'];
export type ReturnTypeRlOrgIdFromConnection =
  Database['public']['Functions']['rls_org_id_from_connection']['Returns'];

export type ArgsRlOrgIdFromCustomer =
  Database['public']['Functions']['rls_org_id_from_customer']['Args'];
export type ReturnTypeRlOrgIdFromCustomer =
  Database['public']['Functions']['rls_org_id_from_customer']['Returns'];

export type ArgsRlOrgIdFromDcu =
  Database['public']['Functions']['rls_org_id_from_dcu']['Args'];
export type ReturnTypeRlOrgIdFromDcu =
  Database['public']['Functions']['rls_org_id_from_dcu']['Returns'];

export type ArgsRlOrgIdFromGrid =
  Database['public']['Functions']['rls_org_id_from_grid']['Args'];
export type ReturnTypeRlOrgIdFromGrid =
  Database['public']['Functions']['rls_org_id_from_grid']['Returns'];

export type ArgsRlOrgIdFromMeter =
  Database['public']['Functions']['rls_org_id_from_meter']['Args'];
export type ReturnTypeRlOrgIdFromMeter =
  Database['public']['Functions']['rls_org_id_from_meter']['Returns'];
