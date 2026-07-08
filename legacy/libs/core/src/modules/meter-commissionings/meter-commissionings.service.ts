import { Injectable } from '@nestjs/common';
import { MeterCommissioning } from './entities/meter-commissioning.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeterCommissioningStatusEnum } from '@core/types/supabase-types';

@Injectable()
export class MeterCommissioningsService {
  constructor(
    @InjectRepository(MeterCommissioning)
    protected readonly meterCommissioningRepository: Repository<MeterCommissioning>,
  ) {
  }

  findAll() {
    return 'This action returns all meterCommissionings';
  }

  async findOne(id: number): Promise<MeterCommissioning> {
    return this.meterCommissioningRepository.findOne({
      relations: {
        metering_hardware_install_session: {
          meter: {
            connection: {
              customer: {
                grid: true,
              },
            },
          },
        },
      },
      where: {
        id,
      },
    });
  }

  async findByLockSession(lockSession: string): Promise<MeterCommissioning> {
    return this.meterCommissioningRepository.findOne({
      where: {
        lock_session: lockSession,
      },
      relations: {
        metering_hardware_install_session: {
          meter: true,
        },
      },
    });
  }

  async findByMeterCommissioningStatus(meterCommissioningStatus: MeterCommissioningStatusEnum): Promise<MeterCommissioning[]> {
    const qb = this.meterCommissioningRepository.createQueryBuilder('meter_commissionings');
    return qb
      .where('meter_commissionings.meter_commissioning_status = :meter_commissioning_status', { meter_commissioning_status: meterCommissioningStatus })
      .getMany();
  }

  async findByIds(meterCommissioningIds: number[]) {
    const qb = this.meterCommissioningRepository.createQueryBuilder('meter_commissionings');
    return qb
      .where('meter_commissionings.id in (:...meter_commissioning_ids)', { meter_commissioning_ids: meterCommissioningIds })
      .getMany();
  }
}
