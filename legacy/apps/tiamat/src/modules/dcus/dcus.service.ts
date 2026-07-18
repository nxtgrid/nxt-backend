import { BadRequestException, ConflictException, HttpException, Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { pluckIdsFrom } from '@helpers/array-helpers';
import { Dcu } from '@core/modules/dcus/entities/dcu.entity';
import { GridsService } from '../grids/grids.service';
import { DcusService as CoreDcuService } from '@core/modules/dcus/dcus.service';
import { CreateDcuInput } from '@core/modules/dcus/dto/create-dcu.input';
import { UpdateDcuInput } from '@core/modules/dcus/dto/update-dcu.input';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { MetersService } from '../meters/meters.service';
import { MeteringHardwareInstallSession } from '@core/modules/metering-hardware-install-sessions/entities/metering-hardware-install-session.entity';
import { MeteringHardwareInstallSessionsService } from '../metering-hardware-install-sessions/metering-hardware-install-sessions.service';
import { CreateDcuFromInventory } from './dto/create-dcu-from-inventory';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { SupabaseService } from '@core/modules/supabase.module';
import { NxtSupabaseUser } from '../auth/nxt-supabase-user';

@Injectable()
export class DcusService extends CoreDcuService {
  constructor(
    @InjectRepository(Dcu)
    public readonly dcuRepository: Repository<Dcu>,
    @Inject(forwardRef(() => GridsService))
    private readonly gridsService: GridsService,
    @Inject(forwardRef(() => MetersService))
    private readonly metersService: MetersService,
    private readonly meteringHardwareInstallSessionsService: MeteringHardwareInstallSessionsService,
    private readonly httpService: HttpService,
    private readonly supabaseService: SupabaseService,
  ) {
    super(dcuRepository);
  }

  // The DCU creation is going to add the DCU to database immediately
  // and mark it as "provisioning", since it has not been installed yet.
  // Also, it is going to send the request to Talos to add the DCU to
  // the Calin interface via Puppeteer. When done, Talos will notify
  // Tiamat about the end result of the operation. In this way, the DCU
  // will be shown as "provisioning" in the UI.
  async assignToGrid(createdcuInput: CreateDcuInput, author: NxtSupabaseUser) {
    const dcu: Dcu = await this.findByExternalReferenceAndExternalSystem(createdcuInput.external_reference, createdcuInput.external_system);
    if (!dcu) throw new BadRequestException(`Dcu ${ createdcuInput.external_reference } does not exist in the system`);

    if (dcu.grid_id) throw new ConflictException(`${ createdcuInput.external_system } DCU with external reference ${ createdcuInput.external_reference } already exists, and is assigned to ${ dcu.grid.name }`);

    const targetGrid: Grid = await this.gridsService.findOne(createdcuInput.grid_id);

    // If it already exists but it does not have a grid, then update it to the new grid
    const updatedDcu: Dcu = await this.update(dcu.id, {
      grid_id: createdcuInput.grid_id,
      rls_organization_id: targetGrid.organization.id,
      communication_protocol: createdcuInput.communication_protocol,
      id: dcu.id,
    });

    // Create audit
    this.supabaseService.adminClient
      .from('audits')
      .insert({
        message: `${ author.full_name } assigned dcu ${ updatedDcu.external_reference } to ${ targetGrid.name } via Ayrton`,
        author_id: author.account_id,
        organization_id: targetGrid.organization.id,
        grid_id: targetGrid.id,
        dcu_id: updatedDcu.id,
      })
      .then(this.supabaseService.handleResponse)
    ;

    // We create a new install session
    const installSession: MeteringHardwareInstallSession = await this.meteringHardwareInstallSessionsService.create(
      {
        dcu_id: updatedDcu.id,
        author_id: author.account_id,
      },
    );

    // We have a dcu property point at the latest dcu session, so it's easily retriavable
    await this.update(updatedDcu.id, {
      last_metering_hardware_install_session_id: installSession.id,
      id: updatedDcu.id,
    });

    // notify talos, which is responsible for the meter-imports and dcu-imports
    // tables and is going to add the dcu to the dcu-imports table as pending
    const dcuImportResponse: any = await this.httpService
      .axiosRef
      .post(`${ process.env.TALOS_API }/metering-hardware-imports`, [
        {
          metering_hardware_install_session_id: installSession.id,
          operation: 'ADD',
        },
      ]);

    const data = dcuImportResponse.data;

    if (!data.length) {
      console.info('No data returned from talos');
      return;
    }

    // at this point, when the frotend tries to query this dcu, it will be shown as
    // existing, but since the last_import is going to be pending, the dcu
    // will be displayed as greyed out. this is until talos updates the
    // status of the latest import.

    //once we have the result, from talos, we add update the dcu entity
    //to set the latest key
    // todo: when passing to monorepo this is going to become type enforced
    return this.meteringHardwareInstallSessionsService.update(installSession.id, {
      last_metering_hardware_import_id: data[0].id,
      id: installSession.id,
    });
  }

  async update(id: number, updatedcuInput: UpdateDcuInput): Promise<Dcu> {
    await this.dcuRepository.update(id, updatedcuInput);
    return this.findOne(id);
  }

  // todo: make it to batch mode
  async updateMany(updatedcuInput: UpdateDcuInput[]) {
    for (const updateItem of updatedcuInput) {
      await this.update(updateItem.id, updateItem);
    }

    return this.findByIds(pluckIdsFrom(updatedcuInput));
  }

  // This calls the removal process on Talos, which in turn
  // will notify Tiamat when the uninstall process is done
  async unassign(id: number, author: NxtSupabaseUser) {
    const dcu = await this.findOne(id);

    if (!dcu) throw new HttpException(`Could not find dcu with id ${ id }`, 500);

    // need to check here if the dcu is still associated to any meter
    const dcuMeters: Meter[] = await this.metersService.findByDcuId(dcu.id);

    if (dcuMeters.length > 0) throw new HttpException(`Could not remove dcu as it's currently used by ${ dcuMeters.length } meters`, 500);

    // Create audit
    this.supabaseService.adminClient
      .from('audits')
      .insert({
        message: `${ author.full_name } removed DCU ${ dcu.external_reference } from ${ dcu.grid.name } via Ayrton`,
        author_id: author.account_id,
        organization_id: dcu.grid.organization.id,
        grid_id: dcu.grid.id,
        dcu_id: dcu.id,
      })
      .then(this.supabaseService.handleResponse)
    ;

    const newSession: MeteringHardwareInstallSession = await this.meteringHardwareInstallSessionsService.create({
      dcu_id: dcu.id,
      meter_id: null,
      author_id: author.account_id,
      last_metering_hardware_import_id: null,
      last_meter_commissioning_id: null,
    });

    await this.update(dcu.id, {
      last_metering_hardware_install_session_id: newSession.id,
      id: dcu.id,
    });

    // Ask talos to remove the meter from calin
    const meterImportResponse: any = await this.httpService
      .axiosRef
      .post(`${ process.env.TALOS_API }/metering-hardware-imports`, [
        {
          dcu_id: id,
          metering_hardware_import_operation: 'REMOVE',
          metering_hardware_install_session_id: newSession.id,
        },
      ]);

    const data = meterImportResponse.data;

    if (data.length < 1) {
      console.info('No data returned from talos');
      return;
    }

    return this.meteringHardwareInstallSessionsService.update(newSession.id, {
      last_metering_hardware_import_id: data[0].id,
      id: newSession.id,
    });
  }

  async handleNewDcuEventFromInventory(newDcu: CreateDcuFromInventory) {
    const existingDcu = await this.supabaseService.adminClient
      .from('dcus')
      .select('id')
      .eq('external_reference', newDcu.external_reference)
      .eq('external_system', newDcu.external_system)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;
    if (existingDcu) return existingDcu;

    return this.supabaseService.adminClient
      .from('dcus')
      .insert(newDcu)
      .select('id')
      .single()
      .then(this.supabaseService.handleResponse)
    ;
  }
}
