import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './entities/agent.entity';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    protected readonly agentRepository: Repository<Agent>,
  ) { }

  findByGridId(gridId: number) {
    const queryBuilder = this.agentRepository.createQueryBuilder('agents');
    return queryBuilder
      .leftJoinAndSelect('agents.account', 'account')
      .leftJoinAndSelect('agents.grid', 'grid')
      .leftJoinAndSelect('agents.wallet', 'wallet')
      .where('agents.grid_id = :grid_id', { grid_id: gridId })
      .orderBy('account.full_name', 'ASC')
      .getMany();
  }

  async findOne(id: number) {
    const qb = this.agentRepository.createQueryBuilder('agents');

    return qb
      .leftJoinAndSelect('agents.grid', 'grid')
      .leftJoinAndSelect('grid.organization', 'organization')
      .leftJoinAndSelect('agents.wallet', 'wallet')
      .leftJoinAndSelect('agents.account', 'account')
      .where('agents.id = :id', { id: id })
      .getOne();
  }
}

