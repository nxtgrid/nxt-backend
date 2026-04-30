import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { pluckIdsFrom } from '@helpers/array-helpers';

import { RoutersService as CoreRouterService } from '@core/modules/routers/routers.service';
import { Router } from '@core/modules/routers/entities/router.entity';
import { UpdateRouterInput } from '@core/modules/routers/dto/update-router.input';
import { CreateRouterInput } from '@core/modules/routers/dto/create-router.input';
import { Account } from '@core/modules/accounts/entities/account.entity';
import { mapAsyncSequential } from '@helpers/promise-helpers';

@Injectable()
export class RoutersService extends CoreRouterService {

  constructor(
    @InjectRepository(Router)
    protected readonly routerRepository: Repository<Router>,
  ) {
    super(routerRepository);
  }

  upsert(createdcuInput: CreateRouterInput[]) {
    return this.routerRepository.save(createdcuInput);
  }

  async update(id: number, updatedcuInput: UpdateRouterInput): Promise<Router> {
    await this.routerRepository.update(id, updatedcuInput);
    return this.findOne(id);
  }

  // todo: make it to batch mode
  async updateMany(updateRouterInput: UpdateRouterInput[]) {
    await mapAsyncSequential(this.update)(updateRouterInput);
    return this.findByIds(pluckIdsFrom(updateRouterInput));
  }

  async softDelete(updatedcuInput: UpdateRouterInput[]) {
    return this.routerRepository.softDelete(pluckIdsFrom(updatedcuInput));
  }

  // maybe we should push this to pagination service?
  remove(id: number, author: Account) {
    console.info(id, author); //just doing this because linter does not let me commit
    throw new Error('Method not implemented.');
  }
}
