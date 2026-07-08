import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    protected readonly customerRepository: Repository<Customer>,
  ) { }

  async findByHiddenFromReportingGroupByGridId(isHiddenFromReporting: boolean): Promise<any[]> {
    const rows = await this.customerRepository.query(
      `
        select grid_id, count(*) as count
        from (
          select grid_id, customer_id, count(*) as connection_count
            from (
              select grid_id, customers.id as customer_id, connection_id, count(*) as count
              from meters
              left join connections on connections.id = meters.connection_id
              left join customers on customers.id = connections.customer_id
              left join grids on grids.id = customers.grid_id
              left join accounts on customers.account_id = accounts.id
              where customers.is_hidden_from_reporting = $1
              and grids.is_hidden_from_reporting = $2
              and accounts.deleted_at is null
              and connections.deleted_at is null
              group by grid_id, customers.id, meters.connection_id
            ) t
            group by grid_id, customer_id
        ) s
        where connection_count > $3
        group by grid_id
      `, [ isHiddenFromReporting, isHiddenFromReporting, 0 ]);

    for (const row of rows) {
      row.count = Number(row.count);
    }

    return rows;
  }
}
