import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dcu } from './entities/dcu.entity';
import { ExternalSystemEnum } from '@core/types/supabase-types';

@Injectable()
export class DcusService {
  constructor(
    @InjectRepository(Dcu)
    public readonly dcuRepository: Repository<Dcu>,
  ) { }

  findOne(id: number) {
    const qb = this.dcuRepository.createQueryBuilder('dcus');

    return qb
      .leftJoinAndSelect('dcus.grid', 'grid')
      .leftJoinAndSelect('grid.organization', 'organization')
      .leftJoinAndSelect('dcus.last_metering_hardware_install_session', 'last_metering_hardware_install_session')
      .where('dcus.id = :dcu_id', { dcu_id: id })
      .getOne();
  }

  findByExternalReference(externalReference: string): Promise<Dcu> {
    const qb = this.dcuRepository.createQueryBuilder('dcus');

    return qb
      .leftJoinAndSelect('dcus.grid', 'grid')
      .leftJoinAndSelect('grid.organization', 'organization')
      .where('dcus.external_reference = :external_reference', { external_reference: externalReference })
      .getOne();
  }

  findByExternalReferenceAndExternalSystem(externalReference: string, externalSystem: ExternalSystemEnum): Promise<Dcu> {
    const qb = this.dcuRepository.createQueryBuilder('dcus');

    return qb
      .leftJoinAndSelect('dcus.grid', 'grid')
      .leftJoinAndSelect('grid.organization', 'organization')
      .where('dcus.external_reference = :external_reference', { external_reference: externalReference })
      .andWhere('dcus.external_system = :external_system', { external_system: externalSystem })
      .getOne();
  }

  findByGridId(gridId: number): Promise<Dcu[]> {
    const qb = this.dcuRepository.createQueryBuilder('dcus');

    return qb
      .leftJoinAndSelect('dcus.grid', 'grid')
      .leftJoinAndSelect('grid.organization', 'organization')
      .where('dcus.grid_id = :grid_id', { grid_id: gridId })
      .getMany();
  }

  async findByIds(ids: number[]): Promise<Dcu[]> {
    // need to do this, because if the array is empty the query will
    // give an error
    if (ids.length < 1) {
      return [];
    }

    const qb = this.dcuRepository.createQueryBuilder('dcus');

    return qb
      .leftJoinAndSelect('dcus.grid', 'grid')
      .leftJoinAndSelect('grid.organization', 'organization')
      .where('dcus.id in (:...ids)', { ids: ids })
      .getMany();
  }
}
