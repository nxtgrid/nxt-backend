import { Injectable } from '@nestjs/common';
import { SolcastCacheService as CoreSolcastCacheService } from '@core/modules/solcast-cache/solcast-cache.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SolcastCache } from '@core/modules/solcast-cache/entities/solcast-cache.entity';
import { Repository } from 'typeorm';
import { CreateSolcastCacheDto } from '@core/modules/solcast-cache/dto/create-solcast-cache.dto';

@Injectable()
export class SolcastCacheService extends CoreSolcastCacheService {
  constructor(
    @InjectRepository(SolcastCache)
    protected readonly solcastCacheRepository: Repository<SolcastCache>,
  ) {
    super(solcastCacheRepository);
  }

  async create(solcastCache: CreateSolcastCacheDto) {
    return this.solcastCacheRepository.save(solcastCache);
  }
}
