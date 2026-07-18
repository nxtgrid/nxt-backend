import { TypeOrmModule } from '@nestjs/typeorm';
import { DcuSnapshot1Min } from '@timeseries/entities/dcu-snapshot-1-min.entity';
import { DeviceDataSink } from '@timeseries/entities/device-data-sink.entity';
import { ExchangeRateSnapshot1D } from '@timeseries/entities/exchange-rate-snapshot-1-d.entity';
import { GridBusinessSnapshot1D } from '@timeseries/entities/grid-business-snapshot-1-d.entity';
import { GridEnergySnapshot15Min } from '@timeseries/entities/grid-energy-snapshot-15-min.entity';
import { GridForecastSnapshot1H } from '@timeseries/entities/grid-forecast-snapshot-1-h.entity';
import { MeterSnapshot1H } from '@timeseries/entities/meter-snapshot-1-h.entity';
import { MpptAssetSnapshot1D } from '@timeseries/entities/mppt-asset-snapshot-1-d.entity';
import { MpptEnergySnapshot15Min } from '@timeseries/entities/mppt-energy-snapshot-15-min.entity';
import { MpptEstimatedActualSnapshot30Min } from '@timeseries/entities/mppt-estimated-actual-snapshot-30-min.entity';
import { MpptForecastSnapshot30Min } from '@timeseries/entities/mppt-forecast-30-min.entity';
import { OrderSnapshot } from '@timeseries/entities/order-snapshot.entity';
import { OrganizationSnapshot1D } from '@timeseries/entities/organization-snapshot-1-d.entity';
import { RouterSnapshot1Min } from '@timeseries/entities/router-snapshot-1-min.entity';

export const TimeseriesTypeOrmModule = TypeOrmModule.forRoot({
  name: 'timescale',
  type: 'postgres',
  host: process.env.NXT_TIMESCALE_DB_HOST,
  port: Number(process.env.NXT_TIMESCALE_DB_PORT),
  username: process.env.NXT_TIMESCALE_DB_USERNAME,
  password: process.env.NXT_TIMESCALE_DB_PASSWORD,
  database: process.env.NXT_TIMESCALE_DB_NAME,
  synchronize: false,
  entities: [
    DcuSnapshot1Min,
    GridBusinessSnapshot1D,
    GridEnergySnapshot15Min,
    GridForecastSnapshot1H,
    MpptAssetSnapshot1D,
    MeterSnapshot1H,
    MpptEnergySnapshot15Min,
    MpptEstimatedActualSnapshot30Min,
    MpptForecastSnapshot30Min,
    OrderSnapshot,
    OrganizationSnapshot1D,
    RouterSnapshot1Min,
    ExchangeRateSnapshot1D,
    DeviceDataSink,
  ],
});
