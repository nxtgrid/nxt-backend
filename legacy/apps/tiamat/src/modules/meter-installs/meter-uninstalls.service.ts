import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@core/modules/supabase.module';
import { CalinLorawanInstallService } from './adapters/calin-lorawan/_install.service';
import { CalinApiV1InstallService } from './adapters/calin-api-v1/_install.service';
import { DeviceManufacturerEnum, DeviceProtocolEnum, NetworkServerImplementation } from '../device-messages/lib/types';
import { getManufacturerAndProtocol } from '../meter-interactions/lib/manufacturer-protocol';
import { CommunicationProtocolEnum } from '@core/types/supabase-types';
import { CalinApiV2InstallService } from './adapters/calin-api-v2/_install.service';
import { unfinishedStatuses } from '../meter-interactions/lib/meter-interaction-status-helpers';

type MeterForUninstallDto = {
  id: number;
  external_reference: string;
  communication_protocol: CommunicationProtocolEnum;
  dcu: {
    external_reference: string;
  };
}

@Injectable()
export class MeterUninstallsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly calinLorawanInstallService: CalinLorawanInstallService,
    private readonly calinApiV1InstallService: CalinApiV1InstallService,
    private readonly calinApiV2InstallService: CalinApiV2InstallService,
  ) {}

  private ROUTE_MAP = {
    CALIN_LORAWAN: this.calinLorawanInstallService,
    CALIN_API_V1: this.calinApiV1InstallService,
    CALIN_API_V2: this.calinApiV2InstallService,
  };

  private getAdapter(manufacturer: DeviceManufacturerEnum, protocol: DeviceProtocolEnum) {
    if(!manufacturer || !protocol)
      throw new Error('Can\'t communicate with Network Server without manufacturer and protocol');
    const implementation = (manufacturer + '_' + protocol) as NetworkServerImplementation;
    const route = this.ROUTE_MAP[implementation];
    if(!route)
      throw new Error(`Can't find Network Server adapter for manufacturer ${ manufacturer } and protocol ${ protocol }`);
    return route;
  }

  public async initialize(meter: MeterForUninstallDto, author_id: number) {
    const { manufacturer, protocol } = getManufacturerAndProtocol(meter.communication_protocol);
    const _adapter = this.getAdapter(manufacturer, protocol);

    const { adminClient: supabase, handleResponse } = this.supabaseService;

    // 1) Create an (un)install session
    const uninstallSession = await supabase
      .from('metering_hardware_install_sessions')
      .insert({ meter_id: meter.id, author_id })
      .select('id')
      .single()
      .then(handleResponse)
    ;

    // 2) Create a removal job
    const deviceRemoval = await supabase
      .from('metering_hardware_imports')
      .insert({
        metering_hardware_install_session_id: uninstallSession.id,
        metering_hardware_import_operation: 'REMOVE',
      })
      .select('id')
      .single()
      .then(handleResponse)
    ;

    // 3) Add the removal job to the (un)install session
    await this.supabaseService.adminClient
      .from('metering_hardware_install_sessions')
      .update({ last_metering_hardware_import_id: deviceRemoval.id })
      .eq('id', uninstallSession.id)
      .then(this.supabaseService.handleResponse)
    ;

    // 4) Update the meter so it shows as uninstalling in the interface
    await supabase
      .from('meters')
      .update({ last_metering_hardware_install_session_id: uninstallSession.id })
      .eq('id', meter.id)
      .then(handleResponse)
    ;

    // 5) Deregister on Network Server
    try {
      const { deferUntilAsynchronousCallback } = await _adapter.deregisterOnNetworkServer({
        external_reference: meter.external_reference,
        dcu_external_reference: meter.dcu.external_reference,
      });
      if(deferUntilAsynchronousCallback) return;
    }
    catch(err) {
      console.error(`[METER-UNINSTALLS] Error deregistering meter ${ meter.external_reference } from network server`);
      console.error(err);
      return;
    }

    // 6) If we immediately succeeded, continue
    await supabase
      .from('metering_hardware_imports')
      .update({ metering_hardware_import_status: 'SUCCESSFUL' })
      .eq('id', deviceRemoval.id)
      .then(handleResponse)
    ;

    this.cleanMeterReferences(meter.id);
  }

  public async resumeDeferredUninstall(external_reference: string, result: 'SUCCESSFUL' | 'FAILED') {
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    const meter = await supabase
      .from('meters')
      .select(`
        id,
        ...last_metering_hardware_install_session_id(
          last_metering_hardware_import_id
        )
      `)
      .eq('external_reference', external_reference)
      .maybeSingle()
      .then(handleResponse)
    ;

    await supabase
      .from('metering_hardware_imports')
      .update({ metering_hardware_import_status: result })
      .eq('id', meter.last_metering_hardware_import_id)
      .then(handleResponse)
    ;

    if(result === 'SUCCESSFUL') this.cleanMeterReferences(meter.id);
  }

  private async cleanMeterReferences(meter_id: number) {
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    // Reset the meter
    await supabase
      .from('meters')
      .update({
        connection_id: null,
        dcu_id: null,
        pole_id: null,
        rls_grid_id: null,
        rls_organization_id: null,
      })
      .eq('id', meter_id)
      .then(handleResponse)
    ;

    // Reset the wallet
    await supabase
      .from('wallets')
      .update({ rls_organization_id: null })
      .eq('meter_id', meter_id)
      .then(handleResponse)
    ;

    // Cancel pending/initialised meter-interactions
    await supabase
      .from('meter_interactions')
      .update({ meter_interaction_status: 'ABORTED' })
      .eq('meter_id', meter_id)
      .in('meter_interaction_status', unfinishedStatuses)
      .then(handleResponse)
    ;

    // Close open issues
    await supabase
      .from('issues')
      .update({ issue_status: 'CLOSED' })
      .eq('meter_id', meter_id)
      .eq('issue_status', 'OPEN')
      .then(handleResponse)
    ;
  }
}
