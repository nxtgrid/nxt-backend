import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Account } from './entities/account.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    protected accountRepository: Repository<Account>,
  ) { }

  findOne(id: number) {
    return this.accountRepository.findOne({
      relations: {
        agent: {
          grid: {
            organization: true,
          },
          wallet: true,
        },
        organization: {
          wallet: true,
        },
        member: {
          busy_commissioning: true,
        },
      },
      where: { id },
    });
  }
}
