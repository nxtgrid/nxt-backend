import { Injectable } from '@nestjs/common';
import { MeteringHardwareImport } from './entities/metering-hardware-import.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class MeteringHardwareImportsService {

  constructor(
    @InjectRepository(MeteringHardwareImport)
    protected readonly meteringHardwareImportRepository: Repository<MeteringHardwareImport>,
  ) { }


  findAll() {
    return 'This action returns all meteringHardwareImports';
  }

  findOne(id: number) {
    const qb = this.meteringHardwareImportRepository.createQueryBuilder('metering_hardware_imports');

    return qb
      .leftJoinAndSelect('metering_hardware_imports.meter', 'meter')
      .leftJoinAndSelect('metering_hardware_imports.dcu', 'dcu')
      .where('metering_hardware_imports.id = :id', { id: id })
      .getOne();
  }

  // todo: turn into query builder based
  async findByIds(ids: number[]) {
    if (ids.length <= 0) {
      return [];
    }

    const query = `select
      metering_hardware_imports.id as id,
      meters.id as meter_id,
      dcus.id as dcu_id,
      metering_hardware_install_sessions.id as metering_hardware_install_session_id,
      meters.external_reference as meter_external_reference,
      dcus.external_reference as dcu_external_reference,
      grids.id as grid_id,
      grids.name as grid_name
      from metering_hardware_imports
      left join metering_hardware_install_sessions on metering_hardware_install_sessions.id = metering_hardware_imports.metering_hardware_install_session_id
      left join meters on meters.id = metering_hardware_install_sessions.meter_id
      left join dcus on dcus.id = metering_hardware_install_sessions.dcu_id
      left join grids on grids.id = dcus.grid_id
      where metering_hardware_imports.id in (${ Array.from(Array(ids.length).keys()).map(index => `$${ index + 1 }`).join(',') })`;

    return this.meteringHardwareImportRepository
      .query(query, ids);
  }

  // todo: turn into query builder based
  async findCurrentlyProcessing(): Promise<any[]> {
    const query = `
          select
          metering_hardware_imports.id as id,
          meters.id as meter_id,
          meters.external_reference as meter_external_reference,
          dcus.id as dcu_id,
          dcus.external_reference as dcu_external_reference
          from metering_hardware_imports
          left join metering_hardware_install_sessions on metering_hardware_install_sessions.id = metering_hardware_imports.metering_hardware_install_session_id
          left join meters on meters.id = metering_hardware_install_sessions.meter_id
          left join dcus on dcus.id = metering_hardware_install_sessions.dcu_id
          where lock_session is not null
          and metering_hardware_imports.metering_hardware_import_status = $1`;

    return this.meteringHardwareImportRepository
      .query(query, [ 'PROCESSING' ])
      .catch(console.error);
  }

  // todo: turn into query builder based
  async findByLockSessionAndType(lockSession: string, type: 'METER' | 'DCU'): Promise<any[]> {
    let query;
    if (type === 'DCU') {
      query = `select
          metering_hardware_imports.metering_hardware_import_operation as metering_hardware_import_operation,
          metering_hardware_imports.id as id,
          metering_hardware_imports.lock_session,
          metering_hardware_install_sessions.id as metering_hardware_install_session_id,
          dcus.id as dcu_id,
          dcus.external_reference as dcu_external_reference,
          grids.name as grid_name
          from metering_hardware_imports
          left join metering_hardware_install_sessions on metering_hardware_install_sessions.id = metering_hardware_imports.metering_hardware_install_session_id
          left join dcus on dcus.id = metering_hardware_install_sessions.dcu_id
          left join grids on grids.id = dcus.grid_id
          where lock_session = $1`;
    }
    else if (type === 'METER') {
      query = `select
          metering_hardware_imports.metering_hardware_import_operation as metering_hardware_import_operation,
          metering_hardware_imports.id as id,
          metering_hardware_imports.lock_session,
          metering_hardware_install_sessions.id as metering_hardware_install_session_id,
          meters.id as meter_id,
          meters.meter_phase as meter_phase,
          meters.external_reference as meter_external_reference,
          dcus.id as dcu_id,
          dcus.external_reference as dcu_external_reference,
          grids.name as grid_name
          from metering_hardware_imports
          left join metering_hardware_install_sessions on metering_hardware_install_sessions.id = metering_hardware_imports.metering_hardware_install_session_id
          left join meters on meters.id = metering_hardware_install_sessions.meter_id
          left join dcus on dcus.id = meters.dcu_id
          left join grids on grids.id = dcus.grid_id
          where lock_session = $1`;
    }

    return this
      .meteringHardwareImportRepository
      .query(query, [ lockSession ])
      .catch(err => {
        console.error(err);
      });
  }
}
