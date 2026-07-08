import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { mapAsyncSequential } from '@helpers/promise-helpers';

import { Grid } from '@core/modules/grids/entities/grid.entity';
import { GridsService } from '@core/modules/grids/grids.service';
import { VictronService } from '@core/modules/victron/victron.service';
import { UpdateGridInput } from '@core/modules/grids/dto/update-grid.input';
import { WeatherTypeEnum } from '@core/types/supabase-types';

@Injectable()
export class WeatherService {
  isWeatherUpdateRunning: boolean = false;

  constructor(
    private readonly httpService: HttpService,
    private readonly gridsService: GridsService,
    private readonly victronService: VictronService,
  ) { }

  @Cron(CronExpression.EVERY_5_MINUTES, { disabled: process.env.NXT_ENV !== 'production' })
  async updateWeather() {
    if (this.isWeatherUpdateRunning) return;
    this.isWeatherUpdateRunning = true;

    try {
      const grids: Grid[] = await this.gridsService.findByIsHiddenFromReporting(false);

      const gridsWithVRMdetails = grids.filter(grid => grid.generation_external_site_id);
      const { results, errors } = await mapAsyncSequential(this.processGrid, { context: this })(gridsWithVRMdetails);
      if (errors.length) console.error(JSON.stringify(errors));


      // Update the result via tiamat
      await this.httpService.axiosRef.put(`${ process.env.TIAMAT_API }/grids`, results, { headers: { 'X-API-KEY': `${ process.env.TIAMAT_API_KEY }` } });
    }
    catch (error) {
      console.error(error);
    }
    finally {
      this.isWeatherUpdateRunning = false;
    }
  }

  async processGrid(grid: Grid): Promise<UpdateGridInput> {
    const weatherType: WeatherTypeEnum = await this.victronService.fetchWeather(grid.generation_external_site_id);
    return { id: grid.id, current_weather: weatherType };
  }
}
