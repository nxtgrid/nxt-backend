import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MeteringHardwareInstallSession } from './entities/metering-hardware-install-session.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MeteringHardwareInstallSessionsService {
  constructor(
    @InjectRepository(MeteringHardwareInstallSession)
    protected readonly meteringHardwareImportRepository: Repository<MeteringHardwareInstallSession>,
  ) { }

  findAll() {
    return 'This action returns all meteringHardwareInstallSessions';
  }

  findOne(id: number) {
    const qb = this.meteringHardwareImportRepository.createQueryBuilder('metering_hardware_install_sessions');

    return qb
      .leftJoinAndSelect('metering_hardware_install_sessions.meter', 'meter')
      .leftJoinAndSelect('metering_hardware_install_sessions.dcu', 'dcu')
      .where('metering_hardware_install_sessions.id = :id', { id: id })
      .getOne();
  }

  async findByIds(ids: number[]): Promise<MeteringHardwareInstallSession[]> {
    // need to do this, because if the array is empty the query will
    // give an error
    if (ids.length < 1) {
      return [];
    }

    const qb = this.meteringHardwareImportRepository.createQueryBuilder('metering_hardware_install_sessions');

    return qb
      .leftJoinAndSelect('metering_hardware_install_sessions.author', 'author')
      .leftJoinAndSelect('author.organization', 'organization')
      .leftJoinAndSelect('author.member', 'member')
      .leftJoinAndSelect('metering_hardware_install_sessions.meter', 'meter')
      .leftJoinAndSelect('meter.connection', 'connection')
      .leftJoinAndSelect('connection.customer', 'customer')
      .leftJoinAndSelect('customer.grid', 'grid')
      .leftJoinAndSelect('metering_hardware_install_sessions.dcu', 'dcu')
      .where('metering_hardware_install_sessions.id in (:...ids)', { ids: ids })
      .getMany();
  }
}
