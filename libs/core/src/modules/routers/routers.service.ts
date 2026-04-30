import { Injectable } from '@nestjs/common';
import { Router } from './entities/router.entity';
import { FindManyOptions, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FindAllRoutersInput } from './dto/find-all-routers.input';
import { ExternalSystemEnum } from '@core/types/supabase-types';

@Injectable()
export class RoutersService {
  constructor(
    @InjectRepository(Router)
    protected readonly routerRepository: Repository<Router>,
  ) { }

  findOne(id: number): Promise<Router> {
    return this.routerRepository.findOne({ where: { id }, relations: { grid: true } });
  }

  findAll(input:FindAllRoutersInput = {}): Promise<Router[]> {
    const { grid_id } = input;
    const options:FindManyOptions<Router> = {};

    if(grid_id) options.where = { grid_id };

    return this.routerRepository.find(options);
  }

  findByExternalSystem(externalSystem: ExternalSystemEnum): Promise<Router[]> {
    return this.routerRepository.find({
      relations: {
        grid: {
          organization: true,
        },
      },
      withDeleted: false,
      where: {
        external_system: externalSystem,
      },
    });
  }

  async findByIds(ids: number[]): Promise<Router[]> {
    return this.routerRepository.find({
      relations: {
        grid: {
          organization: true,
        },
      },
      withDeleted: false,
      where: { id: In(ids) },
    });
  }
}
