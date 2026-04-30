import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Connection } from './entities/connection.entity';

@Injectable()
export class ConnectionsService {
  constructor(
    @InjectRepository(Connection)
    protected readonly connectionRepository: Repository<Connection>,
  ) { }

  // @TODO :: Move these into true sql queries or possibly refactor entirely
  async findPublicGroupedByProductionAndIsHiddenFromReporting(isHiddenFromReporting: boolean): Promise<any[]> {
    const rows = await this.connectionRepository.query(`
      select t.organization_id, grid_id, count(*) as count, sum(women_impacted_count) as women_impacted_count
      from (
        select grids.organization_id, grid_id, connections.id, sum(connections.women_impacted) as women_impacted_count
        from meters
        left join connections on connections.id = meters.connection_id
        left join customers on customers.id = connections.customer_id
        left join grids on grids.id = customers.grid_id
        left join accounts on customers.account_id = accounts.id
        where
        accounts.deleted_at is null
        and connections.is_public = $1
        and grids.deleted_at is null
        and customers.is_hidden_from_reporting = $2
        and grids.is_hidden_from_reporting = $3
        and connections.deleted_at is null
        and meters.deleted_at is null
        group by grids.organization_id, grid_id, connections.id
      ) t
      group by organization_id, grid_id
    `, [ true, isHiddenFromReporting, isHiddenFromReporting ]);

    for (const row of rows) {
      row.count = Number(row.count);
      row.women_impacted_count = Number(row.women_impacted_count);
    }

    return rows;
  }

  async findCommercialGroupedByProductionAndIsHiddenFromReporting(isHiddenFromReporting: boolean): Promise<any[]> {
    const rows = await this.connectionRepository.query(`
      select organization_id, grid_id, count(*) as count, sum(women_impacted_count) as women_impacted_count
      from (
        select grids.organization_id, grid_id, connections.id, sum(connections.women_impacted) as women_impacted_count
        from meters
        left join connections on connections.id = meters.connection_id
        left join customers on customers.id = connections.customer_id
        left join grids on grids.id = customers.grid_id
        left join accounts on customers.account_id = accounts.id
        where
        accounts.deleted_at is null
        and connections.is_commercial = $1
        and grids.deleted_at is null
        and customers.is_hidden_from_reporting = $2
        and grids.is_hidden_from_reporting = $3
        and connections.deleted_at is null
        and meters.deleted_at is null
        group by grids.organization_id, grid_id, connections.id
      ) t
      group by organization_id, grid_id
    `, [ true, isHiddenFromReporting, isHiddenFromReporting ]);

    for (const row of rows) {
      row.count = Number(row.count);
      row.women_impacted_count = Number(row.women_impacted_count);
    }

    return rows;
  }

  async findLifelineConnectionsGroupedByProductionAndIsHiddenFromReporting(isHiddenFromReporting: boolean): Promise<any[]> {
    const rows = await this.connectionRepository.query(`select grid_id, sum(is_lifeline::int) as count
        from connections
        left join customers on customers.id = connections.customer_id
        left join grids on grids.id = customers.grid_id
        left join accounts on customers.account_id = accounts.id
        where
        accounts.deleted_at is null
        and grids.deleted_at is null
        and customers.is_hidden_from_reporting = $1
        and grids.is_hidden_from_reporting = $2
        and connections.deleted_at is null
        group by customers.grid_id
    `, [ isHiddenFromReporting, isHiddenFromReporting ]);

    for (const row of rows) {
      row.count = Number(row.count);
    }

    return rows;
  }

  async findResidentialGroupedByProductionAndIsHiddenFromReporting(isHiddenFromReporting: boolean): Promise<any[]> {
    const rows = await this.connectionRepository.query(`
      select organization_id, grid_id, count(*) as count, sum(women_impacted_count) as women_impacted_count
      from (
        select grids.organization_id, grid_id, connections.id, sum(connections.women_impacted) as women_impacted_count
        from meters
        left join connections on connections.id = meters.connection_id
        left join customers on customers.id = connections.customer_id
        left join grids on grids.id = customers.grid_id
        left join accounts on customers.account_id = accounts.id
        where
        accounts.deleted_at is null
        and connections.is_residential = $1
        and grids.deleted_at is null
        and customers.is_hidden_from_reporting = $2
        and grids.is_hidden_from_reporting = $3
        and connections.deleted_at is null
        and meters.deleted_at is null
        group by grids.organization_id, grid_id, connections.id
      ) t
      group by organization_id, grid_id
    `, [ true, isHiddenFromReporting, isHiddenFromReporting ]);

    for (const row of rows) {
      row.count = Number(row.count);
      row.women_impacted_count = Number(row.women_impacted_count);
    }

    return rows;
  }
}
