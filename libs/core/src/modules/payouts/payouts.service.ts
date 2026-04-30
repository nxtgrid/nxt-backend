import { Injectable } from '@nestjs/common';
import { Payout } from './entities/payout.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(Payout)
    protected readonly payoutRepository: Repository<Payout>,
  ) { }

  findByOrganizationId(organizationId: number) {
    const qb = this.payoutRepository.createQueryBuilder('payouts');

    return qb
      .leftJoinAndSelect('payouts.organization', 'organization')
      .where('organization.id = :organization_id', { organization_id: organizationId })
      .getOne();
  }

  findOne(id: number) {
    const qb = this.payoutRepository.createQueryBuilder('payouts');

    return qb
      .leftJoinAndSelect('payouts.approved_by', 'approved_by')
      .leftJoinAndSelect('payouts.grid', 'grid')
      .where('payouts.id = :id', { id: id })
      .getOne();
  }

  findByIds(ids: number[]) {
    if (ids.length < 1) return [];

    const qb = this.payoutRepository.createQueryBuilder('payouts');

    return qb
      .leftJoinAndSelect('payouts.approved_by', 'approved_by')
      .leftJoinAndSelect('payouts.grid', 'grid')
      .where('payouts.id in (:...ids)', { ids: ids })
      .getMany();
  }
}
