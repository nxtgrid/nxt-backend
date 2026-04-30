import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grid } from './entities/grid.entity';
// import { ExternalSystemEnum } from '@core/types/supabase-types';

@Injectable()
export class GridsService {
  constructor(
    @InjectRepository(Grid)
    public readonly gridRepository: Repository<Grid>,
  ) { }
  findByIsHiddenFromReporting(isHiddenFromReporting: boolean): Promise<Grid[]> {
    const qb = this.gridRepository.createQueryBuilder('grids');
    return qb
      .leftJoinAndSelect('grids.organization', 'organization')
      .where('grids.is_hidden_from_reporting = :is_hidden_from_reporting ', { is_hidden_from_reporting: isHiddenFromReporting })
      .getMany();
  }

  findByIsAutomaticMeterEnergyConsumptionSyncEnabled(isEnabled: boolean): Promise<Grid[]> {
    return this.gridRepository.find({
      where: {
        is_automatic_meter_energy_consumption_data_sync_enabled: isEnabled,
      }, relations: {
        organization: true,
      },
    });
  }

  // findByGenerationExternalSystemAndIsGenerationDataSyncEnabled(generationExternalSystem: ExternalSystemEnum, isEnabled: boolean): Promise<Grid[]> {
  //   return this.gridRepository.find({
  //     where: {
  //       generation_external_system: generationExternalSystem,
  //       is_automatic_energy_generation_data_sync_enabled: isEnabled,
  //     }, relations: {
  //       organization: true,
  //     },
  //   });
  // }

  findByOrganizationId(organizationId: number): Promise<Grid[]> {
    const qb = this.gridRepository.createQueryBuilder('grids');
    return qb
      .leftJoinAndSelect('grids.organization', 'organization')
      .where('grids.organization_id = :organization_id ', { organization_id: organizationId })
      .getMany();
  }

  findByOrganizationIdAndIsHiddenFromReporting(organizationId: number, isHiddenFromReporting: boolean): Promise<Grid[]> {
    const qb = this.gridRepository.createQueryBuilder('grids');
    return qb
      .leftJoinAndSelect('grids.organization', 'organization')
      .where('grids.organization_id = :organization_id ', { organization_id: organizationId })
      .andWhere('grids.is_hidden_from_reporting = :is_hidden_from_reporting ', { is_hidden_from_reporting: isHiddenFromReporting })
      .getMany();
  }

  findOne(id: number) {
    const qb = this.gridRepository.createQueryBuilder('grids');

    return qb
      .leftJoinAndSelect('grids.organization', 'organization')
      .where('grids.id = :grid_id', { grid_id: id })
      .getOne();
  }

  findByName(name: string) {
    const qb = this.gridRepository.createQueryBuilder('grids');

    return qb
      .leftJoinAndSelect('grids.organization', 'organization')
      .where('grids.name = :name', { name: name })
      .getOne();
  }

  findAll(): Promise<Grid[]> {
    const qb = this.gridRepository.createQueryBuilder('grids');

    return qb
      .leftJoinAndSelect('grids.organization', 'organization')
      .getMany();
  }

  async findByIds(ids: number[]): Promise<Grid[]> {
    if (!ids.length)return [];

    const qb = await this.gridRepository.createQueryBuilder('grids');

    return qb
      .leftJoinAndSelect('grids.organization', 'organization')
      .where('grids.id in (:...ids)', { ids: ids })
      .getMany();
  }
}
