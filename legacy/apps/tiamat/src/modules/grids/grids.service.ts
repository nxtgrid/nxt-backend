import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { any, identity } from 'ramda';
import { pluckIdsFrom } from '@helpers/array-helpers';
import { mapAsyncSequential } from '@helpers/promise-helpers';

import { GridsService as CoreGridsService } from '@core/modules/grids/grids.service';
import { DcusService } from '../dcus/dcus.service';
import { MetersService } from '../meters/meters.service';

import { Grid } from '@core/modules/grids/entities/grid.entity';
import { Dcu } from '@core/modules/dcus/entities/dcu.entity';
import { Meter } from '@core/modules/meters/entities/meter.entity';

import { UpdateGridInput } from '@core/modules/grids/dto/update-grid.input';

import { getConnectivityStats } from './queries/getConnectivityStats.query';
import { SupabaseService } from '@core/modules/supabase.module';

@Injectable()
export class GridsService extends CoreGridsService {
  constructor(
    @InjectRepository(Grid)
    public readonly gridRepository: Repository<Grid>,
    @Inject(forwardRef(() => DcusService))
    private readonly dcusService: DcusService,
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => MetersService))
    private readonly metersService: MetersService,
    private readonly supabaseService: SupabaseService,
  ) {
    super(gridRepository);
  }

  async update(id: number, updateGridInput: UpdateGridInput) {
    await this.gridRepository.update(id, updateGridInput);
    const updatedGrid = await this.findOne(id);

    return updatedGrid;
  }

  async updateMany(updateGridInputs: UpdateGridInput[]) {
    for (const updateItem of updateGridInputs) {
      await this.update(updateItem.id, updateItem);
    }

    return this.findByIds(pluckIdsFrom(updateGridInputs));
  }

  async recalculateCabinCreditDepletionById(gridId: number) {
    const meters: Meter[] = await this.metersService.findByGridIdViaCustomer(gridId);

    const isDepleting = any(identity,
      meters
        .filter(meter => meter.is_cabin_meter)
        .map(meter => meter.kwh_credit_available < 50),
    );

    await this.supabaseService.adminClient
      .from('grids')
      .update({ is_cabin_meter_credit_depleting: isDepleting })
      .eq('id', gridId)
      .then(this.supabaseService.handleResponse)
    ;

    return { id: gridId };
  }

  async recalculateCabinCreditDepletionByIds(gridIds: number[]) {
    const { results } = await mapAsyncSequential(this.recalculateCabinCreditDepletionById.bind(this))(gridIds);
    return results;
  }

  async getMeteringHardwareConnectivityStatsByGridId(gridId: number): Promise<any> {
    const onlineMetersPercGroup = await this.gridRepository.query(getConnectivityStats(), [ gridId, gridId ]);

    const meters = onlineMetersPercGroup
      // First we cast values from db to their proper types
      .map(({ is_online, percentage }) => ({ is_online: is_online === 1, percentage: Number(percentage) }))
      // Then we make sure that both online_pct and offline_pct are always represented,
      // even if all meters are online or all meters are offline
      .reduce((accObj, { is_online, percentage }) => {
        if (is_online)
          accObj.online_pct = percentage;
        else
          accObj.offline_pct = percentage;

        return accObj;
      }, { online_pct: 0, offline_pct: 0 })
      ;

    const dcus: Dcu[] = await this.dcusService.findByGridId(gridId);
    const onlineDcus: Dcu[] = dcus.filter(dcu => dcu.is_online);
    const offlineDcus: Dcu[] = dcus.filter(dcu => !dcu.is_online);

    return {
      meters,
      dcus: {
        online: onlineDcus.map(dcu => dcu.external_reference),
        offline: offlineDcus.map(dcu => dcu.external_reference),
      },
    };
  }
}
