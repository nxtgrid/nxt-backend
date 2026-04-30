import { Injectable } from '@nestjs/common';
import { ApiKey } from './entities/api-key.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    protected readonly apiKeyRepository: Repository<ApiKey>,
  ) { }

  findByKeyAndIsLocked(key: string, isLocked: false) {
    const qb = this.apiKeyRepository.createQueryBuilder('api_keys');

    return qb
      .leftJoinAndSelect('api_keys.account', 'account')
      .leftJoinAndSelect('account.customer', 'customer')
      .leftJoinAndSelect('account.agent', 'agent')
      .leftJoinAndSelect('account.member', 'member')
      .leftJoinAndSelect('account.organization', 'organization')
      .where('api_keys.is_locked = :is_locked', { is_locked: isLocked })
      .andWhere('api_keys.key = :key', { key: key })
      .getOne();
  }
}
