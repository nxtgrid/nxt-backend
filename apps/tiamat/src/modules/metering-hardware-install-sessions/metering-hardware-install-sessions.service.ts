import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { pluckIdsFrom } from '@helpers/array-helpers';

import { CreateMeteringHardwareInstallSessionInput } from './dto/create-metering-hardware-install-session.input';
import { UpdateMeteringHardwareInstallSessionInput } from './dto/update-metering-hardware-install-session.input';
import { MeteringHardwareInstallSessionsService as CoreMeteringHardwareInstallSessionsService } from '@core/modules/metering-hardware-install-sessions/metering-hardware-install-sessions.service';
import { MeteringHardwareInstallSession } from '@core/modules/metering-hardware-install-sessions/entities/metering-hardware-install-session.entity';

@Injectable()
export class MeteringHardwareInstallSessionsService extends CoreMeteringHardwareInstallSessionsService {
  constructor(
    @InjectRepository(MeteringHardwareInstallSession)
    protected readonly meteringHardwareInstallSessionRepository: Repository<MeteringHardwareInstallSession>,
  ) {
    super(meteringHardwareInstallSessionRepository);
  }

  async create(createMeteringHardwareInstallSessionInput: CreateMeteringHardwareInstallSessionInput) {
    const result = await this.meteringHardwareImportRepository.insert(createMeteringHardwareInstallSessionInput);
    return this.findOne(result.identifiers[0].id);
  }

  async createMany(createMeteringHardwareInstallSessionInput: CreateMeteringHardwareInstallSessionInput[]) {
    const { identifiers } = await this.meteringHardwareImportRepository.insert(createMeteringHardwareInstallSessionInput);
    const ids = pluckIdsFrom(identifiers);
    return this.findByIds(ids);
  }

  async update(id: number, updateMeteringHardwareInstallSessionInput: UpdateMeteringHardwareInstallSessionInput) {
    await this.meteringHardwareInstallSessionRepository.update(id, updateMeteringHardwareInstallSessionInput);
    return this.findOne(id);
  }

  // todo: implement batch mode
  async updateMany(updateMeteringHardwareInstallSessionInputs: UpdateMeteringHardwareInstallSessionInput[]) {
    const results  = [];
    for (const updateItem of updateMeteringHardwareInstallSessionInputs) {
      const res = await this.update(updateItem.id, updateItem);
      results.push(res);
    }

    return results;
  }

  remove(id: number) {
    return `This action removes a #${ id } meteringHardwareInstallSession`;
  }
}
