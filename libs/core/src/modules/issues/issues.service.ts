import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Issue } from './entities/issue.entity';
import { Repository } from 'typeorm';
import { ExternalSystemEnum } from '@core/types/supabase-types';

@Injectable()
export class IssuesService {
  constructor(
    @InjectRepository(Issue)
    protected readonly issueRepository: Repository<Issue>,
  ) { }

  async findByIds(ids: number[]): Promise<Issue[]> {
    // need to do this, because if the array is empty the query will
    // give an error
    if (ids.length < 1) {
      return [];
    }

    const qb = this.issueRepository.createQueryBuilder('issues');

    return qb
      .leftJoinAndSelect('issues.meter', 'meter')
      .leftJoinAndSelect('meter.connection', 'connection')
      .leftJoinAndSelect('connection.customer', 'customer')
      .leftJoinAndSelect('customer.account', 'account')
      .leftJoinAndSelect('customer.grid', 'grid')
      .leftJoinAndSelect('grid.organization', 'organization')
      .leftJoinAndSelect('issues.mppt', 'mppt')
      .where('issues.id in (:...ids)', { ids: ids })
      .getMany();
  }

  findOne(id: number) {
    const qb = this.issueRepository.createQueryBuilder('issues');

    return qb
      .leftJoinAndSelect('issues.meter', 'meter')
      .leftJoinAndSelect('meter.connection', 'connection')
      .leftJoinAndSelect('connection.customer', 'customer')
      .leftJoinAndSelect('customer.account', 'account')
      .leftJoinAndSelect('customer.grid', 'grid')
      .leftJoinAndSelect('grid.organization', 'organization')
      .leftJoinAndSelect('issues.mppt', 'mppt')
      .where('issues.id = :id', { id: id })
      .getOne();
  }

  findByExternalReferenceAndExternalSystem(externalReference: string, externalSystem: ExternalSystemEnum) {
    const queryBuilder = this.issueRepository.createQueryBuilder('issues');
    return queryBuilder
      .leftJoinAndSelect('issues.meter', 'meter')
      .leftJoinAndSelect('issues.mppt', 'mppt')
      .where('issues.external_reference = :external_reference', { external_reference: externalReference })
      .andWhere('issues.external_system = :external_system', { external_system: externalSystem })
      .getOne();
  }
}
