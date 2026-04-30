import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Meter } from './entities/meter.entity';
import { Repository } from 'typeorm';
import { isNotNil } from 'ramda';
import { IssueStatusEnum, MeterCommissioningStatusEnum } from '@core/types/supabase-types';

@Injectable()
export class MetersService {
  constructor(
    @InjectRepository(Meter)
    public readonly metersRepository: Repository<Meter>,
  ) { }

  async findByExternalReference(externalReference: string): Promise<Meter> {
    const meterQb = this.metersRepository.createQueryBuilder('meters');

    return meterQb
      .leftJoinAndSelect('meters.wallet', 'wallet')
      .leftJoinAndSelect('meters.dcu', 'dcu')
      .leftJoinAndSelect('meters.connection', 'connection')
      .leftJoinAndSelect('meters.last_metering_hardware_install_session', 'last_metering_hardware_install_session')
      .leftJoinAndSelect('last_metering_hardware_install_session.last_metering_hardware_import', 'last_metering_hardware_import')
      .leftJoinAndSelect('last_metering_hardware_install_session.last_meter_commissioning', 'last_meter_commissioning')
      .leftJoinAndSelect('connection.customer', 'customer')
      .leftJoinAndSelect('customer.account', 'account')
      .leftJoinAndSelect('customer.grid', 'grid')
      .leftJoinAndSelect('grid.organization', 'organization')
      .where('meters.external_reference = :external_reference', { external_reference: externalReference })
      .getOne();
  }

  findByCustomerId(customerId: number): Promise<Meter[]> {
    const meterQb = this.metersRepository.createQueryBuilder('meters');

    return meterQb
      .leftJoinAndSelect('meters.connection', 'connection')
      .leftJoinAndSelect('connection.customer', 'customer')
      .leftJoinAndSelect('customer.account', 'account')
      .leftJoinAndSelect('customer.grid', 'grid')
      .where('connection.customer_id = :customer_id', { customer_id: customerId })
      .getMany();
  }

  // Finds all meters by following the customer path to a grid
  findByGridIdViaCustomer(
    gridId: number,
    options?: { offset?: number, limit?: number, includeUnsuccessfulInstalls?: boolean },
  ): Promise<Meter[]> {
    const meterQb = this.metersRepository.createQueryBuilder('meters');

    meterQb
      .leftJoinAndSelect('meters.connection', 'connection')
      .leftJoinAndSelect('connection.customer', 'customer')
      .leftJoinAndSelect('customer.account', 'account')
      .leftJoinAndSelect('meters.dcu', 'dcu')
      // .leftJoinAndSelect('meters.pole', 'pole')
      .leftJoinAndSelect('meters.last_encountered_issue', 'last_encountered_issue')
      .leftJoinAndSelect('meters.last_metering_hardware_install_session', 'last_metering_hardware_install_session')
      .leftJoinAndSelect('last_metering_hardware_install_session.last_metering_hardware_import', 'last_metering_hardware_import')
      .leftJoinAndSelect('last_metering_hardware_install_session.last_meter_commissioning', 'last_meter_commissioning')
      .where('customer.grid_id = :grid_id', { grid_id: gridId })
    ;

    if(!options?.includeUnsuccessfulInstalls)
      meterQb.andWhere('last_meter_commissioning.meter_commissioning_status = :c_status', { c_status: 'SUCCESSFUL' });
    if (isNotNil(options?.limit)) meterQb.limit(options.limit);
    if (isNotNil(options?.offset)) meterQb.offset(options.offset);
    meterQb.orderBy('last_meter_commissioning.created_at', 'DESC');

    return meterQb.getMany();
  }

  findByDcuId(dcuId: number): Promise<Meter[]> {
    return this.metersRepository
      .createQueryBuilder('meters')
      .leftJoinAndSelect('meters.dcu', 'dcu')
      .leftJoinAndSelect('meters.connection', 'connection')
      .leftJoinAndSelect('connection.customer', 'customer')
      .leftJoinAndSelect('customer.account', 'account')
      .where('dcu.id = :dcu_id', { dcu_id: dcuId })
      .getMany();
  }

  // finds all meters by following the dcu path to a grid
  findByGridIdAndIsUnassigned(gridId: number, isUnassigned: boolean): Promise<Meter[]> {
    const qb = this.metersRepository.createQueryBuilder('meters');

    qb
      .leftJoinAndSelect('meters.connection', 'connection')
      .leftJoinAndSelect('meters.dcu', 'dcu')
      .leftJoinAndSelect('connection.customer', 'customer')
      .leftJoinAndSelect('customer.account', 'account')
      .leftJoinAndSelect('meters.last_encountered_issue', 'last_encountered_issue')
      .where('dcu.grid_id = :grid_id', { grid_id: gridId });

    if (isUnassigned) {
      qb.andWhere('meters.connection_id is null');
    }
    else {
      qb.andWhere('meters.connection_id is not null');
    }

    return qb
      .orderBy('meters.external_reference', 'ASC')
      .getMany();
  }

  findOne(id: number) {
    const qb = this.metersRepository.createQueryBuilder('meters');

    return qb
      .leftJoinAndSelect('meters.connection', 'connection')
      .leftJoinAndSelect('meters.pole', 'pole')
      .leftJoinAndSelect('meters.last_metering_hardware_install_session', 'last_metering_hardware_install_session')
      .leftJoinAndSelect('last_metering_hardware_install_session.last_metering_hardware_import', 'last_metering_hardware_import')
      .leftJoinAndSelect('last_metering_hardware_install_session.last_meter_commissioning', 'last_meter_commissioning')
      .leftJoinAndSelect('meters.last_encountered_issue', 'last_encountered_issue')
      .leftJoinAndSelect('meters.wallet', 'wallet')
      .leftJoinAndSelect('connection.customer', 'customer')
      .leftJoinAndSelect('customer.account', 'account')
      .leftJoinAndSelect('customer.grid', 'grid')
      .leftJoinAndSelect('customer.wallet', 'customer_wallet')
      .leftJoinAndSelect('grid.organization', 'organization')
      .leftJoinAndSelect('meters.dcu', 'dcu')
      .where('meters.id = :id', { id: id })
      .getOne();
  }

  async findByIds(ids: number[]): Promise<Meter[]> {
    // need to do this, because if the array is empty the query will
    // give an error
    if (ids.length < 1) return [];

    const qb = this.metersRepository.createQueryBuilder('meters');

    return qb
      .leftJoinAndSelect('meters.connection', 'connection')
      .leftJoinAndSelect('meters.dcu', 'dcu')
      .leftJoinAndSelect('connection.customer', 'customer')
      .leftJoinAndSelect('meters.last_encountered_issue', 'last_encountered_issue')
      .leftJoinAndSelect('meters.last_metering_hardware_install_session', 'last_metering_hardware_install_session')
      .leftJoinAndSelect('last_metering_hardware_install_session.last_meter_commissioning', 'last_meter_commissioning')
      .leftJoinAndSelect('customer.grid', 'grid')
      .leftJoinAndSelect('grid.organization', 'organization')
      .where('meters.id in (:...ids)', { ids: ids })
      .getMany();
  }

  findByIssueCheckExecutionSession(executionSession: string): Promise<Meter[]> {
    const queryBuilder = this.metersRepository.createQueryBuilder('meters');
    return queryBuilder
      .leftJoinAndSelect('meters.connection', 'connection')
      .leftJoinAndSelect('meters.dcu', 'dcu')
      .leftJoinAndSelect('connection.customer', 'customer')
      .leftJoinAndSelect('customer.grid', 'grid')
      .leftJoinAndSelect('meters.last_encountered_issue', 'last_encountered_issue')
      .leftJoinAndSelect('meters.last_metering_hardware_install_session', 'last_metering_hardware_install_session')
      .leftJoinAndSelect('last_metering_hardware_install_session.last_meter_commissioning', 'last_meter_commissioning')
      .where('meters.issue_check_execution_session = :execution_session', { execution_session: executionSession })
      .getMany();
  }

  async findGroupedByGridAndFilterByIsHiddenFromReporting(isHiddenFromReporting: boolean): Promise<any[]> {
    const rows = await this.metersRepository.query(`
      select organizations.id as organization_id, grids.id as grid_id, meters.meter_type as meter_type, count(*) as count
      from meters
      left join connections on connections.id = meters.connection_id
      left join customers on customers.id = connections.customer_id
      left join accounts on customers.account_id = accounts.id
      left join grids on grids.id = customers.grid_id
      left join organizations on organizations.id = grids.organization_id
      where grids.deleted_at is null
      and customers.is_hidden_from_reporting = $1
      and grids.is_hidden_from_reporting = $2
      and accounts.deleted_at is null
      group by organizations.id, grids.id, meters.meter_type
      `, [
      isHiddenFromReporting,
      isHiddenFromReporting,
    ]);

    for (const row of rows) {
      row.count = Number(row.count);
    }

    return rows;
  }

  async findGroupedByMeterPhaseIsHiddenFromReporting(isHiddenFromReporting: boolean): Promise<any[]> {
    const rows = await this.metersRepository.query(`
      select organizations.id as organization_id, grids.id as grid_id, meters.meter_phase as meter_phase, count(*) as count
      from meters
      left join connections on connections.id = meters.connection_id
      left join customers on customers.id = connections.customer_id
      left join accounts on customers.account_id = accounts.id
      left join grids on grids.id = customers.grid_id
      left join organizations on organizations.id = grids.organization_id
      where grids.deleted_at is null
      and customers.is_hidden_from_reporting = $1
      and grids.is_hidden_from_reporting = $2
      and accounts.deleted_at is null
      group by organizations.id, grids.id, meters.meter_phase
      `, [
      isHiddenFromReporting,
      isHiddenFromReporting,
    ]);

    for (const row of rows) {
      row.count = Number(row.count);
    }

    return rows;
  }

  async findGroupedMetersByLastEncounteredIssueType(isHiddenFromReporting: boolean, issueStatus: IssueStatusEnum) {
    const rows = await this.metersRepository.query(`select grids.organization_id as organization_id, grids.id as grid_id, issues.issue_type, count(meters.id) as count
      from meters
      left join connections on connections.id = meters.connection_id
      left join customers on customers.id = connections.customer_id
      left join accounts on customers.account_id = accounts.id
      left join grids on grids.id = customers.grid_id
      left join issues on issues.id = meters.last_encountered_issue_id
      where
      grids.deleted_at is null
      and customers.is_hidden_from_reporting = $1
      and grids.is_hidden_from_reporting = $2
      and issues.issue_type is not null
      and issues.issue_status = $3
      and accounts.deleted_at is null
      group by grids.id, issues.issue_type`,
    [
      isHiddenFromReporting,
      isHiddenFromReporting,
      issueStatus,
    ]);

    for (const row of rows) {
      row.count = Number(row.count);
    }

    return rows;
  }

  isReadyToBeToppedUp(meter: {
    connection: {
      customer: {
        id: number;
      };
    };
    last_metering_hardware_install_session: {
      last_meter_commissioning: {
        meter_commissioning_status: MeterCommissioningStatusEnum;
      };
    };
  }) {
    return meter?.connection?.customer && meter?.last_metering_hardware_install_session?.last_meter_commissioning?.meter_commissioning_status === 'SUCCESSFUL';
  }
}
