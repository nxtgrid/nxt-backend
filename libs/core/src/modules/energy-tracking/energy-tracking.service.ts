import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import moment from 'moment';

const QUERY = `select time_bucket_gapfill('1 day', "created_at") as bucket,
  coalesce(max(battery_modules_on_count), 0) as battery_modules_on_count,
  coalesce(max(battery_modules_off_count), 0) as battery_modules_off_count
  from grid_business_snapshot_1_d
  where created_at >= $1
  and created_at < $2
  and grid_id = $3
  group by bucket`;

type BatteryModulesSnapshot = {
  bucket: string;
  battery_modules_on_count: number;
  battery_modules_off_count: number;
}

@Injectable()
export class EnergyTrackingService {
  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
  ) { }

  async getActiveBatteryModules(
    gridId: number,
    start: moment.Moment,
    end: moment.Moment,
  ): Promise<BatteryModulesSnapshot[]> {
    return this.timescale.query(QUERY, [
      start.format('YYYY-MM-DD HH:mm:ss'),
      end.format('YYYY-MM-DD HH:mm:ss'),
      gridId,
    ]);
  }
}
