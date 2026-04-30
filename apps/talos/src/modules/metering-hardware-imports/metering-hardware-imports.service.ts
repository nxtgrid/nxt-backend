import { Inject, Injectable, OnModuleInit, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeteringHardwareImportsService as CoreMeteringHardwareImportsService } from '@core/modules/metering-hardware-imports/metering-hardware-imports.service';
import { CalinService } from '../calin/calin.service';
import { MeteringHardwareImport } from '@core/modules/metering-hardware-imports/entities/metering-hardware-import.entity';
import { CreateMeteringHardwareImportInput } from '@core/modules/metering-hardware-imports/dto/create-metering-hardware-import.input';
import { UpdateMeteringHardwareImportInput } from '@core/modules/metering-hardware-imports/dto/update-metering-hardware-import.input';
import { Cron } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { HttpService } from '@nestjs/axios';
import { SupabaseService } from '@core/modules/supabase.module';
import { RAW_QUERIES, LockDcuResult, LockDcuParams } from '@talos/queries';

const { NXT_ENV, TIAMAT_API, TIAMAT_API_KEY, CONCURRENT_SESSIONS } = process.env;
const TIAMAT_API_OPTIONS = { headers: { 'X-API-KEY': TIAMAT_API_KEY } };

@Injectable()
export class MeteringHardwareImportsService extends CoreMeteringHardwareImportsService implements OnModuleInit {
  isInstallLoopRunning = false;

  constructor(
    @InjectRepository(MeteringHardwareImport)
    protected meteringHardwareImportRepository: Repository<MeteringHardwareImport>,
    @Inject(forwardRef(() => CalinService))
    private readonly calinService: CalinService,
    private readonly httpService: HttpService,
    private readonly supabaseService: SupabaseService,
  ) {
    super(meteringHardwareImportRepository);
  }

  onModuleInit() {
    this.installLoop();
  }

  async create(hardwareImports: CreateMeteringHardwareImportInput[]) {
    console.info('[CREATE]', hardwareImports);
    const toInsert: CreateMeteringHardwareImportInput[] = hardwareImports.map(({ metering_hardware_install_session_id, metering_hardware_import_operation }) => ({
      metering_hardware_install_session_id,
      metering_hardware_import_operation,
      metering_hardware_import_status: 'PENDING',
    }));

    const res = await this.meteringHardwareImportRepository.insert(toInsert);

    // we attempt to run the install already
    this.installLoop();

    return this.findByIds(res.identifiers.map(({ id }) => id));
  }

  async update(id: number, updateMeterImportInput: UpdateMeteringHardwareImportInput) {
    return this.meteringHardwareImportRepository.query(`update metering_hardware_imports
          set metering_hardware_import_status = $1
          where metering_hardware_imports.id = $2`, [ updateMeterImportInput.metering_hardware_import_status, id ]);
  }

  async updateMany(updateMeterImportInput: any[]) {
    for (const meterUpdate of updateMeterImportInput) {
      await this.update(meterUpdate.id, meterUpdate);
    }

    const ids = updateMeterImportInput.map(({ id }) => id);
    return this.findByIds(ids);
  }

  async lockNextByType(lockSession: string, type: 'DCU' | 'METER'): Promise<any[]> {
    if (type === 'DCU') {
      const params: LockDcuParams = [
        'PROCESSING',
        lockSession,
        'PENDING',
        true,
        'CALIN_LORAWAN',
        'CALIN_LORAWAN',
        true,
        1,
      ];
      const _result: LockDcuResult = await this.meteringHardwareImportRepository.query(
        RAW_QUERIES.sql.supabase.meteringHardwareImports.lockDcu,
        params,
      );
    }

    // return the rows that we have locked
    const res = await this.findByLockSessionAndType(lockSession, type);
    return res[0];
  }

  async processImportByType(hardwareImport: any): Promise<any> {
    const isDcu = !!hardwareImport.dcu_external_reference;
    const isAdd = hardwareImport.metering_hardware_import_operation === 'ADD';
    const isRemove = hardwareImport.metering_hardware_import_operation === 'REMOVE';

    try {
      if (isDcu) {
        const dcu = await this.supabaseService.adminClient
          .from('dcus')
          .select(`
            id,
            external_reference,
            communication_protocol,
            grid:grids(name)
          `)
          .eq('id', hardwareImport.dcu_id)
          .maybeSingle()
          .then(this.supabaseService.handleResponse)
        ;
        if (isAdd) await this.calinService.importDcu(dcu);
        if (isRemove) { await this.calinService.removeDcu(dcu);}
      }
      else {
        throw new Error('Process import only accepts DCU or METER types. Invalid type supplied.');
      }

      // @TODO :: In theory the correct way of doing this would be to have a loop that checks every
      // few seconds, since it's an async operation. However, for the time being this is good enough.
      await this.update(hardwareImport.id, { metering_hardware_import_status: 'SUCCESSFUL' });

      if (isDcu && isRemove) {
        this.httpService
          .axiosRef
          .put(`${ TIAMAT_API }/dcus`, [ {
            id: hardwareImport.dcu_id,
            grid: null,
            rls_organization_id: null,
          } ], TIAMAT_API_OPTIONS);
      }
    }
    catch (err) {
      console.error(err);
      this.isInstallLoopRunning = false;
      return this.update(hardwareImport.id, {
        metering_hardware_import_status: 'FAILED',
      });
    }
    finally {
      this.importDcusInParallel();
    }
  }

  async importDcusInParallel(): Promise<void> {
    const concurrency = Number(CONCURRENT_SESSIONS || 10);
    let dcuImport: any;
    let processingImports: MeteringHardwareImport[] = [];

    do {
      const lockSession = uuidv4();

      // this is going to find anything that's processing, independently of whether
      // it is a meter import or a dcu import
      processingImports = await this.findCurrentlyProcessing();
      // if there are already too many sessions running, then skip altogether
      if (processingImports.length >= concurrency) {
        console.info('Already too many hardware imports running. Skipping...');
        break;
      }

      dcuImport = await this.lockNextByType(lockSession, 'DCU');
      // If there are no pending DCUs to import, exit
      if (!dcuImport) break;

      // we do not wait for this action to complete, but keep going until we
      // comp
      this.processImportByType(dcuImport);
    } while (dcuImport);
  }

  @Cron('*/15 * * * *', { disabled: NXT_ENV !== 'production' })
  async installLoop() {
    if (this.isInstallLoopRunning) {
      console.info('Skipping install loop since busy...');
      return;
    }

    this.isInstallLoopRunning = true;

    try {
      await this.importDcusInParallel();
    }
    catch (err) {
      console.error(err);
      this.isInstallLoopRunning = false;
    }
  }

}
