import { Injectable } from '@nestjs/common';
import { SolcastCache } from './entities/solcast-cache.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SolcastRequestType } from '@core/types/solcast-type';
import { SolcastParams } from '@core/types/solcast-params';

@Injectable()
export class SolcastCacheService {
  constructor(
    @InjectRepository(SolcastCache)
    protected readonly solcastCacheRepository: Repository<SolcastCache>,
  ) { }

  // Solcast uses latitude and longitude to determine whether a call was made to the same location
  async find(request_type: SolcastRequestType, createdAt: moment.Moment, options: SolcastParams): Promise<SolcastCache> {
    const qb = await this.solcastCacheRepository.createQueryBuilder('solcast');

    const cap = Math.round(options.capacity * 1000) / 1000;
    const res = await qb
      .where('solcast.latitude = :latitude', { latitude: options.latitude })
      .andWhere('solcast.longitude = :longitude', { longitude: options.longitude })
      .andWhere('solcast.azimuth = :azimuth', { azimuth: options.azimuth })
      .andWhere('solcast.tilt = :tilt', { tilt: options.tilt })
      // @TODO: not happy about having to round to exactly 3 digits in order to get the comparison to work
      // (In fact the table is storing the values with always 3 digits via decimal(10, 3))
      .andWhere('solcast.capacity_kwp = :capacity_kwp', { capacity_kwp: cap })
      .andWhere('solcast.install_date = :install_date', { install_date: options.install_date })
      .andWhere('solcast.created_at >= :created_at', { created_at: createdAt.format('YYYY-MM-DD HH:mm:ss') })
      .andWhere('solcast.request_type = :request_type', { request_type })
      .getOne();

    if (!res) {
      return null;
    }

    return JSON.parse(res.response);
  }
}
