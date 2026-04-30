import { ConflictException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import { writeFile } from 'fs';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import File from 'multer'; // to run tests
const readline = require('readline');

// Entities
import { Meter } from '@core/modules/meters/entities/meter.entity';

// DTOs
import { AssignMeterDto } from './dto/assign-meter.dto';
import { ApiTokenGenerationDto } from './dto/token-generation.dto';
import { CreateMeterFromInventoryDto } from './dto/create-meter-from-inventory.dto';

// Services
import { MetersService as CoreMetersService } from '@core/modules/meters/meters.service';
import { ConnectionsService } from '@tiamat/modules/connections/connections.service';
import { SupabaseService } from '@core/modules/supabase.module';
import { MeterInstallsService } from '../meter-installs/meter-installs.service';

// Queries
import { NxtSupabaseUser } from '../auth/nxt-supabase-user';
import { CommunicationProtocolEnum, InsertMeter } from '@core/types/supabase-types';
import { MeterInteractionsService } from '../meter-interactions/meter-interactions.service';
import { MeterUninstallsService } from '../meter-installs/meter-uninstalls.service';
import { UpdateMeterInput } from '@core/modules/meters/dto/update-meter.input';
import { pluckIdsFrom } from '@helpers/array-helpers';
import { LockIssuesPageParams, LockIssuesPageResult, RAW_QUERIES } from '@tiamat/queries';
import moment from 'moment';

const MAX_INSTALLS_PER_CALIN_DCU = 200;

@Injectable()
export class MetersService extends CoreMetersService {
  constructor(
    @InjectRepository(Meter)
    public readonly metersRepository: Repository<Meter>,
    @Inject(forwardRef(() => ConnectionsService))
    protected readonly connectionService: ConnectionsService,
    protected readonly httpService: HttpService,
    private readonly supabaseService: SupabaseService,
    private readonly meterInteractionsService: MeterInteractionsService,
    private readonly meterInstallsService: MeterInstallsService,
    private readonly meterUninstallsService: MeterUninstallsService,
  ) {
    super(metersRepository);
  }

  private async selectGatewayBySpillover(grid_id: number, communication_protocol: CommunicationProtocolEnum) {
    const gateways = await this.supabaseService.adminClient
      .from('dcus')
      .select(`
        id,
        external_reference,
        grid:grids!inner(id),
        meters(count)
      `, { count: 'exact' })
      .eq('grid.id', grid_id)
      .eq('communication_protocol', communication_protocol)
      .then(this.supabaseService.handleResponse)
      .then(_dcus => _dcus
        .map(({ id, external_reference, meters }) => ({ id, external_reference, meter_count: meters?.[0]?.count ?? 0 }))
        .sort((_a, _b) => _b.meter_count - _a.meter_count),
      )
    ;
    if (!gateways.length) return;
    // LoRaWAN has no maximum, just assign to the first
    if(communication_protocol === 'CALIN_LORAWAN') {
      const { id, external_reference } = gateways[0];
      return { id, external_reference };
    }
    // Otherwise, try to find the first DCU that's not 'full', i.e. spillover
    for (const { id, external_reference, meter_count } of gateways) {
      if(meter_count < MAX_INSTALLS_PER_CALIN_DCU) return { id, external_reference };
    }
    return;
  }

  async assignMeter(assignMeterDto: AssignMeterDto, author: NxtSupabaseUser) {
    console.info('[ASSIGN METER]', assignMeterDto);
    const PERF_start_checks = performance.now();

    // Validate the user before starting since we're relying heavily on direct db calls
    await author.validate();

    const { adminClient: supabase, handleResponse } = this.supabaseService;

    const _meter = await supabase
      .from('meters')
      .select(`
        id,
        external_reference,
        communication_protocol,
        meter_phase,
        version,
        last_seen_at,
        last_sts_token_issued_at,
        decoder_key,
        connection_id,
        dcu:dcus(
          id,
          external_reference
        ),
        wallet:wallets(
          id
        )
      `)
      .eq('external_reference', assignMeterDto.external_reference)
      .is('deleted_at', null)
      .maybeSingle()
      .then(handleResponse)
    ;

    if (!_meter) throw new NotFoundException(`Meter ${ assignMeterDto.external_reference } does not exist in system (yet).`);

    if (_meter.connection_id) throw new ConflictException(`Meter ${ assignMeterDto.external_reference } is already assigned to a customer.`);

    // @NOTE :: This is meter manufacturer/protocol aware
    if (
      _meter.communication_protocol !== 'CALIN_LORAWAN' &&
      _meter.dcu
    ) throw new ConflictException(`
      Meter ${ assignMeterDto.external_reference } uses ${ _meter.communication_protocol }, and is already assigned to a gateway.
      These meters need to be free of any existing gateway connections before assignment.
    `);

    const _connection = await supabase
      .from('connections')
      .select(`
        id,
        meters(
          id,
          meter_type
        ),
        customer:customers!inner(
          id,
          account:accounts!inner(
            full_name
          ),
          grid:grids!inner(
            id,
            name,
            meter_commissioning_initial_credit_kwh,
            organization:organizations(
              id
            )
          )
        )
      `)
      .eq('id', assignMeterDto.connection_id)
      .is('customer.account.deleted_at', null)
      .maybeSingle()
      .then(handleResponse)
    ;

    if (!_connection) throw new NotFoundException(`Could not find a connection with ID ${ assignMeterDto.connection_id }.`);

    const conflictingMeters = _connection.meters.filter(({ meter_type }) => meter_type === assignMeterDto.meter_type);
    if (conflictingMeters.length) throw new ConflictException(`
      The customer that we're assigning meter ${ assignMeterDto.external_reference } to
      already has a meter of type ${ assignMeterDto.meter_type }.
    `);

    const selectedGateway = await this.selectGatewayBySpillover(_connection.customer.grid.id, _meter.communication_protocol);
    if (!selectedGateway) throw new InternalServerErrorException(`
      Grid ${ _connection.customer.grid.name } does not have any gateway available with room to accommodate this meter.
      Installation of meter ${ assignMeterDto.external_reference } failed.
    `);

    const PERF_end_checks = performance.now();
    const PERF_checks_duration = Math.round(PERF_end_checks - PERF_start_checks);
    console.info(`[ASSIGN METER] Took ${ PERF_checks_duration }ms doing meter checks.`);
    const PERF_start_update = performance.now();

    await supabase
      .from('meters')
      .update({
        dcu_id: selectedGateway.id,
        connection_id: _connection.id,
        pole_id: assignMeterDto.pole_id,
        meter_type: assignMeterDto.meter_type,

        // @TOCHECK :: Bit weird to assign the phase of a meter?
        meter_phase: assignMeterDto.meter_phase,

        rls_grid_id: _connection.customer.grid.id,
        rls_organization_id: _connection.customer.grid.organization.id,

        // @TOCHECK :: Necessary?
        should_be_on: true,
        should_be_on_updated_at: (new Date()).toISOString(),
        power_limit: (assignMeterDto.meter_type === 'HPS') ? 200 : 0,
      })
      .eq('id', _meter.id)
      .then(handleResponse)
    ;

    // Also (re-)assign the meter's wallet to match RLS rules
    await supabase
      .from('wallets')
      .update({ rls_organization_id: _connection.customer.grid.organization.id })
      .eq('id', _meter.wallet.id)
      .then(handleResponse)
    ;

    const PERF_end_update = performance.now();
    const PERF_update_duration = Math.round(PERF_end_update - PERF_start_update);
    console.info(`[ASSIGN METER] Took ${ PERF_update_duration }ms doing meter and wallet updates.`);
    const PERF_start_commissioning = performance.now();

    const installSessionId = await this.meterInstallsService.initialize({
      ..._meter,
      connection: _connection,
      dcu: selectedGateway,
    }, author);
    // @TODO :: This is done here now but can be merged with the earlier update
    // once installation refactor is done
    await supabase
      .from('meters')
      .update({ last_metering_hardware_install_session_id: installSessionId })
      .eq('id', _meter.id)
      .then(handleResponse)
    ;

    const PERF_end_commissioning = performance.now();
    const PERF_commissioning_duration = Math.round(PERF_end_commissioning - PERF_start_commissioning);
    console.info(`[ASSIGN METER] Took ${ PERF_commissioning_duration }ms creating new commissioning.`);

    const message = `
      ${ author.full_name } assigned meter ${ assignMeterDto.external_reference }
      to ${ _connection.customer.account.full_name } via Sphinx.
    `;
    author.supabase.client
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id: _connection.customer.grid.organization.id,
        grid_id: _connection.customer.grid.id,
        connection_id: _connection.id,
        customer_id: _connection.customer.id,
        meter_id: _meter.id,
        dcu_id: selectedGateway.id,
      })
      .then(author.supabase.handleResponse)
    ;

    const PERF_entire_duration = Math.round(performance.now() - PERF_start_checks);
    console.info(`[ASSIGN METER] Took ${ PERF_entire_duration }ms for the entire assignment process.`);

    return { id: _meter.id };
  }

  async startMeterUnassignment(meter_id: number, author: NxtSupabaseUser) {
    // @TEMPORARY :: Validate the user because we don't have all the proper RLS rules set to use author.supabase.client
    author.validate();

    const meter = await this.supabaseService.adminClient
      .from('meters')
      .select(`
        id,
        external_reference,
        communication_protocol,
        dcu:dcus(
          external_reference
        ),
        connection:connections(
          id,
          customer:customers(
            id,
            account:accounts(
              full_name
            ),
            grid:grids(
              id,
              name,
              organization:organizations(
                id
              )
            )
          )
        )
      `)
      .eq('id', meter_id)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;

    if (!meter) throw new NotFoundException(`Could not find meter with id: ${ meter_id }`);

    await this.meterUninstallsService.initialize(meter, author.account_id);

    this.supabaseService.adminClient
      .from('audits')
      .insert({
        message: `${ author.full_name } unassigned meter ${ meter.external_reference } from customer ${ meter?.connection?.customer?.account.full_name } in ${ meter?.connection?.customer?.grid?.name }`,
        author_id: author.account_id,
        meter_id,
        connection_id: meter?.connection?.id,
        customer_id: meter?.connection?.customer?.id,
        grid_id: meter.connection?.customer?.grid?.id,
        organization_id: meter.connection?.customer?.grid?.organization?.id,
      })
      .then(this.supabaseService.handleResponse)
    ;

    return { id: meter_id };
  }

  async handleNewMeterEventFromInventory(createMeterDto: CreateMeterFromInventoryDto): Promise<{ id: number }> {
    const { adminClient: supabase, handleResponse } = this.supabaseService;
    const existingMeter = await supabase
      .from('meters')
      .select('id')
      .eq('external_reference', createMeterDto.external_reference)
      .maybeSingle()
      .then(handleResponse)
    ;
    if (existingMeter) return existingMeter;

    return supabase
      .from('meters')
      .insert(createMeterDto)
      .select('id')
      .single()
      .then(handleResponse)
    ;
  }

  private parseMeterFileContent(file: Express.Multer.File): Promise<{ external_reference: string; decoder_key: string; }[]> {
    return new Promise(resolve => {
      const meters = [];
      const line = readline.createInterface({
        input: Readable.from(file.buffer),
      });
      line.on('line', (text: string) => {
        const array = text.split(',');
        meters.push({
          external_reference: array[0],
          decoder_key: array[1],
        });
      });
      line.on('close', () => resolve(meters));
    });
  }

  // Takes a meter import CSV file with a list of meters.
  // It checks for meters that are already existing. If a meter
  // already exists, then it simply marks it as in test mode.
  // If a meter does not exists, it creates an install session.
  // Once that is done, an emtpy commissioning
  // is created (which means that the meter is immediately accessible
  // from the frontend). Once a meter is no longer needed in testing,
  // only the is_test_mode_on property is updated.
  async importTestMeters(file: Express.Multer.File, author: NxtSupabaseUser): Promise<void> {
    // We parse the file content into meter objects
    const _meters = await this.parseMeterFileContent(file);
    const meterReferences: string[] = _meters.map(({ external_reference }) => external_reference);

    const { client: supabase, handleResponse } = author.supabase;

    // Fetch the meters from database
    const _existingMeters = await supabase
      .from('meters')
      .select('id, external_reference, connection_id')
      .eq('external_system', 'CALIN')
      .in('external_reference', meterReferences)
      .then(handleResponse);
    const existingMeterReferences = _existingMeters.map(({ external_reference }) => external_reference);

    // Mark the existing meters as being in test mode
    await supabase
      .from('meters')
      .update({ is_test_mode_on: true })
      .in('external_reference', existingMeterReferences)
      .then(handleResponse);

    // Find the references of the meters that are not included in the existing meter list
    const newMeterReferences = meterReferences.filter(ref => !existingMeterReferences.includes(ref));

    // Once we know the meters that need to be created, then
    // we can add them to database with is_test_mode_on enabled
    const metersToInsert: InsertMeter[] = newMeterReferences.map(external_reference => ({
      external_reference,
      external_system: 'CALIN',
      communication_protocol: 'CALIN_LORAWAN',
      is_test_mode_on: true,
    }));

    // @TODO :: Check where to go from here
    // Looks like an install without commissioning?
    console.info('[IMPORT TEST METERS] These meters were not imported', metersToInsert);
    return;
  }

  async getOfflineClearTamperTokens(file: Express.Multer.File): Promise<string> {
    const _meters = await this.parseMeterFileContent(file);
    const meterReferences = _meters.map(({ external_reference }) => external_reference);

    const meterTokens = [];
    for(const external_reference of meterReferences) {
      try {
        const { token } = await this.generateToken(external_reference, { meter_interaction_type: 'CLEAR_TAMPER' });
        meterTokens.push({ token, external_reference });
      }
      // eslint-disable-next-line
      catch(_err){}
    }

    const uuid = uuidv4();

    const toWrite: string = meterTokens
      .map(({ external_reference, token }) => `${ external_reference },${ token }`)
      .sort()
      .join('\n');

    return new Promise((resolve, reject) => {
      writeFile(join(`${ process.env.UPLOAD_FOLDER }/${ uuid }`), toWrite, err => {
        if (err) return reject(err);
        return resolve(`${ process.env.UPLOAD_FOLDER }/${ uuid }`);
      });
    });
  }

  async generateToken(meterExternalReference: string, generateTokenDto: ApiTokenGenerationDto): Promise<{ token: string; }> {
    const meter = await this.supabaseService.adminClient
      .from('meters')
      .select(`
        id,
        external_reference,
        last_sts_token_issued_at,
        communication_protocol,
        meter_phase,
        version,
        decoder_key,
        last_seen_at,
        dcu_id,
        ...connections(
          ...customers(
            grid_id
          )
        )
      `)
      .eq('external_reference', meterExternalReference)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;
    if (!meter) throw new NotFoundException(`Meter ${ meterExternalReference } not found`);

    return this.meterInteractionsService.generateTokenForMeter(generateTokenDto, meter);
  }

  async deliverPreexistingToken(externalReference: string, token: string) {
    const meter = await this.supabaseService.adminClient
      .from('meters')
      .select(`
        id,
        external_reference,
        last_sts_token_issued_at,
        communication_protocol,
        decoder_key,
        last_seen_at,
        meter_phase,
        version,
        dcu_id,
        ...connections(
          ...customers(
            grid_id
          )
        )
      `)
      .eq('external_reference', externalReference)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;
    if(!meter) throw new NotFoundException(`Couldn't find meter with external reference ${ externalReference }`);

    const safeToken = token.replace(/\s/g, '');

    // @TODO :: Unify meter fetching from external reference maybe?
    return this.meterInteractionsService.createOneForMeter({
      meter_id: meter.id,
      meter_interaction_type: 'DELIVER_PREEXISTING_TOKEN',
      token: safeToken,
    }, meter);
  }

  // @TO-DEPRECATE
  async update(id: number, updateMeterInput: UpdateMeterInput) {
    await this.metersRepository.update(id, updateMeterInput);
    return this.findOne(id);
  }

  // @TO-DEPRECATE (Issues service)
  async updateMany(updateMeterInput: UpdateMeterInput[]) {
    for (const updateItem of updateMeterInput) {
      await this.update(updateItem.id, updateItem);
    }

    return this.findByIds(pluckIdsFrom(updateMeterInput));
  }

  // @TO-DEPRECATE (Issues service)
  async lockNextMeterIssuePage(executionSession: string, before: moment.Moment, limit: number): Promise<Meter[]> {
    const params: LockIssuesPageParams = [
      executionSession,
      moment().toDate(),
      before.toDate(),
      limit,
    ];
    const _result: LockIssuesPageResult = await this.metersRepository.query(
      RAW_QUERIES.sql.supabase.meters.lockIssuesPage,
      params,
    );

    return this.findByIssueCheckExecutionSession(executionSession);
  }
}
