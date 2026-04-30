import { Injectable, InternalServerErrorException, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { isNil } from 'ramda';
import { SupabaseService } from '@core/modules/supabase.module';
import { SupabaseClient } from '@supabase/supabase-js';
import { VictronService } from '@core/modules/victron/victron.service';
import moment from 'moment';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { MeterTypeEnum } from '@core/types/supabase-types';
import { AUTOPILOT_FALLBACK_CODE } from './autopilot-fallback-code';

const babelParser = require('@babel/parser');
const recast = require('recast');

@Injectable()
export class AutopilotService implements OnModuleInit {
  s3;
  filename;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly victronService: VictronService,
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
  ) { }

  onModuleInit() {
    this.filename = process.env.AUTOPILOT_S3_FILENAME;
    this.s3 = new S3Client({
      region: process.env.AUTOPILOT_S3_REGION,
      endpoint: process.env.AUTOPILOT_S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AUTOPILOT_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AUTOPILOT_S3_ACCESS_KEY_SECRET,
      },
    });
  }

  async streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  async get() {
    if (!process.env.AUTOPILOT_S3_ACCESS_KEY_ID || !process.env.AUTOPILOT_S3_ACCESS_KEY_SECRET || !this.filename) {
      console.warn('Autopilot: S3 credentials not configured, using bundled fallback code');
      return AUTOPILOT_FALLBACK_CODE;
    }

    try {
      const data = await this.s3.send(new GetObjectCommand({
        Bucket: 'aglaonike',
        Key: this.filename,
      }));
      return this.streamToString(data.Body);
    }
    catch (error) {
      console.error('Autopilot: S3 fetch failed, using bundled fallback code:', error.message);
      return AUTOPILOT_FALLBACK_CODE;
    }
  }

  createNodeFromValue(value, buil) {
    if (Array.isArray(value)) {
      return buil.arrayExpression(value.map(item => this.createNodeFromValue(item, buil)));
    }
    else if (typeof value === 'object' && value !== null) {
      const properties = Object.entries(value).map(([ key, val ]) => {
        const keyNode = buil.identifier(key);
        const valueNode = this.createNodeFromValue(val, buil);
        return buil.property('init', keyNode, valueNode);
      });
      return buil.objectExpression(properties);
    }
    else {
      return buil.literal(value); // Handle literals (strings, numbers, booleans, null)
    }
  }

  overrideVariableInitialization(code, variableName, newValue) {
    const customParser = {
      parse(source) {
        return babelParser.parse(source, {
          sourceType: 'module', // Handle ES modules
          plugins: [ 'typescript' ], // Enable TypeScript parsing
        });
      },
    };
    // Parse the code into an AST
    const ast = recast.parse(code, { parser: customParser });

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    // Traverse the AST to find the variable declaration
    recast.types.visit(ast, {
      visitVariableDeclarator(path) {
        const { node } = path;


        if (node.id.name === variableName) {
          const buil = recast.types.builders;
          // Override the initialization value
          node.init = self.createNodeFromValue(newValue, buil);
          return false; // Stop further traversal
        }
        this.traverse(path);
      },
    });

    // Convert the modified AST back to code
    return recast.print(ast).code;
  }

  // Legacy
  // private async getHourlyConsumptionForecastByGridIdAndMeterType(
  //   gridId: number,
  //   meterType: MeterType,
  //   start: moment.Moment,
  //   end: moment.Moment,
  //   minConsumptionKwh: number,
  //   maxConsumptionKwh: number) {

  //   const query = `select date_part('hour', bucket) as utc_hour, date_part('minute', bucket) as minute,
  //     coalesce(avg(consumption_kwh), 0) as kwh
  //     from (
  //       select time_bucket_gapfill('30 minutes', created_at) as bucket,
  //         locf(sum(consumption_kwh) / 2) as consumption_kwh
  //         from meter_snapshot_1_h
  //         where grid_id = $1
  //         and created_at >= $2
  //         and created_at < $3
  //         and meter_type = $4
  //         and consumption_kwh >= $5
  //         and consumption_kwh < $6
  //         group by bucket
  //     ) as t
  //     group by utc_hour, minute`;

  //   return this.timescale.query(query, [
  //     gridId,
  //     start.format('YYYY-MM-DD HH:mm:ss'),
  //     end.format('YYYY-MM-DD HH:mm:ss'),
  //     meterType,
  //     minConsumptionKwh,
  //     maxConsumptionKwh,
  //   ]);
  // }

  private async getHourlyProductionForecastByGridId(gridId: number, start: moment.Moment, end: moment.Moment) {
    const query = `select date_part('hour', bucket) as utc_hour, date_part('minute', bucket) as minute, coalesce(kwh, 0) as kwh
      from (
        select time_bucket_gapfill('30 minutes', period_start, $2, $3) as bucket,
          coalesce(sum(pv_estimate_kw) / 2, 0) as kwh
            from mppt_forecast_snapshot_30_min
            where grid_id = $1
            and period_start >= $2
            and period_start < $3
            group by bucket
      ) as t`;

    const params = [ gridId, start.format('YYYY-MM-DD HH:mm:ss'), end.format('YYYY-MM-DD HH:mm:ss') ];
    const res = await this.timescale.query(query, params);
    return [ res, query, params ];
  }


  private async meterConsumption(gridId, consumptionTypes: MeterTypeEnum[], agg: 'avg' | 'min' | 'max', start: moment.Moment, end: moment.Moment, minConsumption: number, maxConsumption: number, minHourlyTotalConsumption: number) {
    let i = 1;
    const params = [
      // minHourlyTotalConsumption, //TODO: add it back using prepared statements
      gridId,
    ];

    let query = `select date_part('hour', bucket) as utc_hour,
      date_part('minute', bucket) as utc_minute,`;

    if (agg === 'avg')
      query += 'coalesce(avg(consumption_kwh), 0) as kwh';
    else if (agg === 'max')
      query += 'coalesce(max(consumption_kwh), 0) as kwh';
    else if (agg === 'min')
      query += `coalesce(min(CASE WHEN (consumption_kwh >= ${ minHourlyTotalConsumption } / 2) THEN consumption_kwh ELSE NULL END), 0) as kwh`;
    else throw Error(`Invalid agg: expected one of min, avg, max, but received ${ agg }`);

    query += `
      from (
      select time_bucket_gapfill('30 minutes', created_at) as bucket,
        locf(sum(consumption_kwh) / 2) as consumption_kwh
        from meter_snapshot_1_h
        where grid_id = $${ i++ }`;

    if (consumptionTypes.includes('FS')) {
      query += ` and is_fs_consumption = $${ i++ } `;
      params.push(true);
    }

    if (consumptionTypes.includes('HPS')) {
      query += ` and is_hps_consumption = $${ i++ } `;
      params.push(true);
    }

    query += `
        and created_at >= $${ i++ }
        and created_at < $${ i++ }
        and consumption_kwh >= $${ i++ }
        and consumption_kwh < $${ i++ }
        group by bucket
      ) as t
      group by utc_hour, utc_minute`;

    params.push(...[
      start.toISOString(),
      end.toISOString(),
      minConsumption,
      maxConsumption ],
    );

    const res = await this.timescale.query(query, params);
    return [ res, query, params ];
  }

  private async gridConsumption(gridId, consumptionTypes: MeterTypeEnum[], agg: 'avg' | 'min' | 'max', start: moment.Moment, end: moment.Moment, minConsumption: number, maxConsumption: number, minHourlyTotalConsumption: number) {
    let i = 1;
    const params = [
      // minHourlyTotalConsumption, //TODO: add it back using prepared statements
      gridId,
    ];

    let query = `select date_part('hour', bucket) as utc_hour,
      date_part('minute', bucket) as utc_minute,`;

    if (agg === 'avg')
      query += 'coalesce(avg(consumption_kwh), 0) as kwh';
    else if (agg === 'max')
      query += 'coalesce(max(consumption_kwh), 0) as kwh';
    else if (agg === 'min')
      query += `coalesce(min(CASE WHEN (consumption_kwh >= ${ minHourlyTotalConsumption } / 2) THEN consumption_kwh ELSE NULL END), 0) as kwh`;
    else throw Error(`Invalid agg: expected one of min, avg, max, but received ${ agg }`);

    query += `
      from (
      select time_bucket_gapfill('30 minutes', created_at) as bucket,
        locf(sum(grid_consumption_total_kwh) / 2) as consumption_kwh
        from grid_energy_snapshot_15_min
        where grid_id = $${ i++ }`;

    if (consumptionTypes.includes('FS')) {
      query += ` and is_fs_active = $${ i++ } `;
      params.push(true);
    }

    if (consumptionTypes.includes('HPS')) {
      query += ` and is_hps_on = $${ i++ } `;
      params.push(true);
    }

    query += `
        and created_at >= $${ i++ }
        and created_at < $${ i++ }
        and grid_consumption_total_kwh >= $${ i++ }
        and grid_consumption_total_kwh < $${ i++ }
        group by bucket
      ) as t
      group by utc_hour, utc_minute`;

    params.push(...[
      start.toISOString(),
      end.toISOString(),
      minConsumption,
      maxConsumption ],
    );

    const res = await this.timescale.query(query, params);
    return [ res, query, params ];
  }

  //private async probableGridConsumption(gridId, fsOrHps: 'FS' | 'HPS') {
  //   let i = 1;
  //   const params = [
  //     // minHourlyTotalConsumption, //TODO: add it back using prepared statements
  //     gridId,
  //     fsOrHps,
  //     fsOrHps,
  //     gridId,
  //     fsOrHps,
  //   ];

  //   const query = `WITH stats AS (
  //       SELECT
  //           date_part('hour', bucket) AS utc_hour,
  //           date_part('minute', bucket) AS utc_min,
  //           MIN(coalesce(consumption_kwh, 0)) AS kwh_min,
  //           MAX(coalesce(consumption_kwh, 0)) AS kwh_max
  //       FROM (
  //           SELECT
  //               time_bucket_gapfill('30 minutes', created_at) AS bucket,
  //               locf(SUM(
  //                 coalesce(grid_l1_power_consumption_total_a1_w, 0) +
  //                 coalesce(grid_l2_power_consumption_total_a2_w, 0) +
  //                 coalesce(grid_l3_power_consumption_total_a3_w, 0)
  //                 ) / 4) AS consumption_kwh
  //           FROM grid_energy_snapshot_15_min
  //           WHERE
  //               grid_id = $${ i++ }
  //               AND ((is_fs_active AND ($${ i++ } = 'FS')) OR (coalesce(is_hps_on, false) AND ($${ i++ } = 'HPS')))
  //               AND created_at >= now() - interval '3 months'
  //         AND created_at <= now()
  //           GROUP BY 1
  //       ) sub
  //       GROUP BY 1, 2
  //   ),
  //   binned AS (
  //       SELECT
  //           date_part('hour', t.bucket) AS utc_hour,
  //           date_part('minute', t.bucket) AS utc_min,
  //           GREATEST(
  //             LEAST(
  //               FLOOR(
  //                 (
  //                   coalesce(t.consumption_kwh, 0) - s.kwh_min
  //                 ) / CASE
  //                     WHEN (s.kwh_max - s.kwh_min) = 0 THEN 1
  //                     ELSE ((s.kwh_max - s.kwh_min) / 50)
  //                 END
  //               ),
  //               49
  //             ),
  //             0
  //           ) AS bin_index,
  //           s.kwh_min,
  //           s.kwh_max
  //       FROM (
  //           SELECT
  //               time_bucket_gapfill('30 minutes', created_at) AS bucket,
  //               locf(SUM(
  //               coalesce(grid_l1_power_consumption_total_a1_w, 0) +
  //               coalesce(grid_l2_power_consumption_total_a2_w, 0) +
  //               coalesce(grid_l3_power_consumption_total_a3_w, 0)
  //               ) / 4) AS consumption_kwh
  //           FROM grid_energy_snapshot_15_min
  //           WHERE
  //               grid_id = $${ i++ }
  //               AND is_fs_active = ($${ i++ } = 'FS')
  //               AND created_at >= now() - interval '3 months'
  //         AND created_at <= now()
  //           GROUP BY 1
  //       ) t
  //       INNER JOIN stats s
  //           ON date_part('hour', t.bucket) = s.utc_hour
  //           AND date_part('minute', t.bucket) = s.utc_min
  //   ),
  //   bin_counts AS (
  //       SELECT
  //           utc_hour,
  //           utc_min,
  //           bin_index,
  //           COUNT(*) AS bin_count,
  //           MAX(kwh_min) AS kwh_min,
  //           MAX(kwh_max) AS kwh_max
  //       FROM binned
  //       GROUP BY utc_hour, utc_min, bin_index
  //   )
  //   SELECT
  //       utc_hour,
  //       utc_min,
  //       AVG((kwh_min + (bin_index + 0.5) * ((kwh_max - kwh_min) / 50))) AS kwh
  //   FROM (
  //       SELECT
  //           utc_hour,
  //           utc_min,
  //           bin_index,
  //           bin_count,
  //           kwh_min,
  //           kwh_max,
  //           RANK() OVER (
  //               PARTITION BY utc_hour, utc_min
  //               ORDER BY bin_count DESC
  //           ) AS rnk
  //       FROM bin_counts
  //   ) sub
  //   WHERE rnk = 1
  //   GROUP BY utc_hour, utc_min
  //   ORDER BY utc_hour, utc_min;`;

  //   const res = await this.timescale.query(query, params);
  //   return [ res, query, params ];
  // }

  private async probableGridConsumption(gridId, fsOrHps: 'FS' | 'HPS'/* , start: moment.Moment, end: moment.Moment */) {
    // Query 1: Get the latest timestamp
    const latestTimestampQuery = `
      SELECT MAX(created_at) as max_created_at
      FROM predicted_consumption
      WHERE grid_id = $1 AND service_type = $2
    `;
    const latestTimestampParams = [ gridId, fsOrHps ];
    const latestTimestampResult = await this.timescale.query(latestTimestampQuery, latestTimestampParams);

    if (!latestTimestampResult?.[0]?.max_created_at) {
      return [ [], latestTimestampQuery, latestTimestampParams ];
    }

    // Query 2: Get the actual data using the timestamp
    const query = `
      SELECT
        hour AS utc_hour,
        min AS utc_min,
        predicted_consumption_kw AS kwh
      FROM predicted_consumption
      WHERE grid_id = $1 AND service_type = $2 AND created_at >= CAST($3 AS date) AND created_at < (CAST($3 AS date) + INTERVAL '1 day')
      ORDER BY utc_hour, utc_min
    `;
    const params = [ gridId, fsOrHps, latestTimestampResult[0].max_created_at ];
    // const query = `WITH stats AS (
    //     SELECT
    //         date_part('hour', bucket) AS utc_hour,
    //         date_part('minute', bucket) AS utc_min,
    //         MIN(coalesce(consumption_kwh, 0)) AS kwh_min,
    //         MAX(coalesce(consumption_kwh, 0)) AS kwh_max
    //     FROM (
    //         SELECT
    //             time_bucket_gapfill('30 minutes', created_at) AS bucket,
    //             locf(SUM(
    //               coalesce(grid_l1_power_consumption_total_a1_w, 0) +
    //               coalesce(grid_l2_power_consumption_total_a2_w, 0) +
    //               coalesce(grid_l3_power_consumption_total_a3_w, 0)
    //               ) / 4) AS consumption_kwh
    //         FROM grid_energy_snapshot_15_min
    //         WHERE
    //             grid_id = $${ i++ }
    //             AND ((is_fs_active AND ($${ i++ } = 'FS')) OR (coalesce(is_hps_on, false) AND ($${ i++ } = 'HPS')))
    //             AND created_at >= now() - interval '3 months'
    //       AND created_at <= now()
    //         GROUP BY 1
    //     ) sub
    //     GROUP BY 1, 2
    // ),
    // binned AS (
    //     SELECT
    //         date_part('hour', t.bucket) AS utc_hour,
    //         date_part('minute', t.bucket) AS utc_min,
    //         GREATEST(
    //           LEAST(
    //             FLOOR(
    //               (
    //                 coalesce(t.consumption_kwh, 0) - s.kwh_min
    //               ) / CASE
    //                   WHEN (s.kwh_max - s.kwh_min) = 0 THEN 1
    //                   ELSE ((s.kwh_max - s.kwh_min) / 50)
    //               END
    //             ),
    //             49
    //           ),
    //           0
    //         ) AS bin_index,
    //         s.kwh_min,
    //         s.kwh_max
    //     FROM (
    //         SELECT
    //             time_bucket_gapfill('30 minutes', created_at) AS bucket,
    //             locf(SUM(
    //             coalesce(grid_l1_power_consumption_total_a1_w, 0) +
    //             coalesce(grid_l2_power_consumption_total_a2_w, 0) +
    //             coalesce(grid_l3_power_consumption_total_a3_w, 0)
    //             ) / 4) AS consumption_kwh
    //         FROM grid_energy_snapshot_15_min
    //         WHERE
    //             grid_id = $${ i++ }
    //             AND is_fs_active = ($${ i++ } = 'FS')
    //             AND created_at >= now() - interval '3 months'
    //       AND created_at <= now()
    //         GROUP BY 1
    //     ) t
    //     INNER JOIN stats s
    //         ON date_part('hour', t.bucket) = s.utc_hour
    //         AND date_part('minute', t.bucket) = s.utc_min
    // ),
    // bin_counts AS (
    //     SELECT
    //         utc_hour,
    //         utc_min,
    //         bin_index,
    //         COUNT(*) AS bin_count,
    //         MAX(kwh_min) AS kwh_min,
    //         MAX(kwh_max) AS kwh_max
    //     FROM binned
    //     GROUP BY utc_hour, utc_min, bin_index
    // )
    // SELECT
    //     utc_hour,
    //     utc_min,
    //     AVG((kwh_min + (bin_index + 0.5) * ((kwh_max - kwh_min) / 50))) AS kwh
    // FROM (
    //     SELECT
    //         utc_hour,
    //         utc_min,
    //         bin_index,
    //         bin_count,
    //         kwh_min,
    //         kwh_max,
    //         RANK() OVER (
    //             PARTITION BY utc_hour, utc_min
    //             ORDER BY bin_count DESC
    //         ) AS rnk
    //     FROM bin_counts
    // ) sub
    // WHERE rnk = 1
    // GROUP BY utc_hour, utc_min
    // ORDER BY utc_hour, utc_min;`;

    const res = await this.timescale.query(query, params);
    return [ res, query, params ];
  }

  determineSource(gridId: number,
    start: moment.Moment,
    end: moment.Moment,
    loadForecastSource:  'meters_hps_max' | 'meters_hps_avg' | 'meters_hps_min' | 'meters_fs_max' | 'meters_fs_avg' | 'meters_fs_min' | 'meters_all_max' | 'meters_all_avg' | 'meters_all_min' | 'inverter_load_max' | 'inverter_load_avg' | 'inverter_load_min' | 'inverter_load_probable',
    minConsumptionKwhSampleThreshold,
    maxConsumptionKwhSampleThreshold,
    minConsumptionKwhThreshold,
    fsOrHps: 'HPS' | 'FS') {
    switch (loadForecastSource) {
      case 'meters_all_max':
        return this.meterConsumption(
          gridId,
          [],
          'max',
          start,
          end,
          minConsumptionKwhSampleThreshold,
          maxConsumptionKwhSampleThreshold,
          minConsumptionKwhThreshold,
        );
      case 'meters_all_avg':
        return this.meterConsumption(
          gridId,
          [],
          'avg',
          start,
          end,
          minConsumptionKwhSampleThreshold,
          maxConsumptionKwhSampleThreshold,
          minConsumptionKwhThreshold,
        );
      case 'meters_all_min':
        return this.meterConsumption(
          gridId,
          [ ],
          'min',
          start,
          end,
          minConsumptionKwhSampleThreshold,
          maxConsumptionKwhSampleThreshold,
          minConsumptionKwhThreshold,
        );
      case 'meters_hps_min':
        return this.meterConsumption(
          gridId,
          [ 'HPS' ],
          'max',
          start,
          end,
          minConsumptionKwhSampleThreshold,
          maxConsumptionKwhSampleThreshold,
          minConsumptionKwhThreshold,
        );
      case 'meters_hps_avg':
        return this.meterConsumption(
          gridId,
          [ 'HPS' ],
          'avg',
          start,
          end,
          minConsumptionKwhSampleThreshold,
          maxConsumptionKwhSampleThreshold,
          minConsumptionKwhThreshold,
        );
      case 'meters_hps_max':
        return this.meterConsumption(
          gridId,
          [ 'HPS' ],
          'max',
          start,
          end,
          minConsumptionKwhSampleThreshold,
          maxConsumptionKwhSampleThreshold,
          minConsumptionKwhThreshold,
        );
      case 'meters_fs_min':
        return this.meterConsumption(
          gridId,
          [ 'FS' ],
          'min',
          start,
          end,
          minConsumptionKwhSampleThreshold,
          maxConsumptionKwhSampleThreshold,
          minConsumptionKwhThreshold,
        );
      case 'meters_fs_avg':
        return this.meterConsumption(
          gridId,
          [ 'FS' ],
          'avg',
          start,
          end,
          minConsumptionKwhSampleThreshold,
          maxConsumptionKwhSampleThreshold,
          minConsumptionKwhThreshold,
        );
      case 'meters_fs_max':
        return this.meterConsumption(
          gridId,
          [ 'FS' ],
          'max',
          start,
          end,
          minConsumptionKwhSampleThreshold,
          maxConsumptionKwhSampleThreshold,
          minConsumptionKwhThreshold,
        );
      case 'inverter_load_probable':
        return this.probableGridConsumption(
          gridId,
          fsOrHps,
          // start,
          // end,
        );
      case 'inverter_load_max':
        return this.gridConsumption(
          gridId,
          [],
          'max',
          start,
          end,
          minConsumptionKwhSampleThreshold,
          maxConsumptionKwhSampleThreshold,
          minConsumptionKwhThreshold,
        );
      case 'inverter_load_avg':
        return this.gridConsumption(
          gridId,
          [],
          'avg',
          start,
          end,
          minConsumptionKwhSampleThreshold,
          maxConsumptionKwhSampleThreshold,
          minConsumptionKwhThreshold,
        );
      case 'inverter_load_min':
        return this.gridConsumption(
          gridId,
          [],
          'min',
          start,
          end,
          minConsumptionKwhSampleThreshold,
          maxConsumptionKwhSampleThreshold,
          minConsumptionKwhThreshold,
        );
      default:
        throw Error(`Invalid source for hps. It should be either, but ${ loadForecastSource } supplied`);
    }
  }

  async eval(params) {
    const grid = await this.supabaseService.adminClient
      .from('grids')
      .select('id, name, generation_external_site_id, is_hps_on, is_fs_on, kwh')
      .eq('id', params.grid_id)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;

    if (!grid) throw new NotFoundException(`Grid with id ${ params.grid_id } not found`);

    const diagnostics = await this.victronService.fetchDiagnostics(grid.generation_external_site_id);
    const soc = diagnostics.find(attribute => attribute.code === 'bs');

    if(isNil(soc)) throw new InternalServerErrorException(`Invalid SoC not available in autopilot run for grid ${ grid.name }`);

    // if the soc was recorded more than 10 minutes ago, then skip since invalid
    const socTimestamp = moment.unix(soc.timestamp);
    const timeoutThreshold = typeof params.soc_max_age_minutes === 'number' ? params.soc_max_age_minutes : 30;
    if(socTimestamp.isBefore(moment().subtract(timeoutThreshold, 'minutes'))) throw new InternalServerErrorException(`Soc supplied by VRM older than ${ timeoutThreshold } minutes in autopilot run for grid ${ grid.name }`);

    const nowUTC = moment.utc();
    const nowParts = {
      year: nowUTC.year(),
      month: nowUTC.month(),
      day: nowUTC.date(),
      hour: nowUTC.hour(),
      minute: nowUTC.minute(),
      second: nowUTC.second(),
      millisecond: nowUTC.millisecond(),
    };
    const minutesToAdd = nowUTC.minutes() > 30 ? 60 - nowUTC.minutes() : 30 - nowUTC.minutes();
    const nextHalfHourUTC = moment(nowUTC).add(minutesToAdd, 'minutes'); //using utc to make it easier to debug locally

    const startingXDaysAgo = typeof params.load_forecast_historical_days === 'number' ? params.load_forecast_historical_days : 30;
    const xDaysAgoUTC = moment(nextHalfHourUTC).subtract(startingXDaysAgo, 'days');
    const twoDaysAgoUTC = moment(nextHalfHourUTC).subtract(2, 'days');
    const tomorrowUTC = moment(nextHalfHourUTC).add(1, 'day');

    // Hotfix constants, needed to overcome the consumption data problems we have been having because of Calin API
    const MIN_CONSUMPTION_KWH_THRESHOLD = 0;
    const MAX_CONSUMPTION_KWH_THRESHOLD = 5;
    const MIN_CONSUMPTION_KWH_TO_DETERMINE_MIN_HOURLY_CONSUMPTION = 0.5;

    let HPS_CONSUMPTION_ARRAY_UTC_INJECTED = [];
    let query1 = '';
    let params1 = [];
    let FS_CONSUMPTION_ARRAY_UTC_INJECTED = [];
    let query2 = '';
    let params2 = [];
    let PRODUCTION_ARRAY_UTC_INJECTED = [];
    let query3 = '';
    let params3 = [];
    try {
      [ HPS_CONSUMPTION_ARRAY_UTC_INJECTED, query1, params1 ] = await this.determineSource(grid.id, xDaysAgoUTC, twoDaysAgoUTC, params.load_forecast_hps_source, MIN_CONSUMPTION_KWH_THRESHOLD, MAX_CONSUMPTION_KWH_THRESHOLD, MIN_CONSUMPTION_KWH_TO_DETERMINE_MIN_HOURLY_CONSUMPTION, 'HPS');
      [ FS_CONSUMPTION_ARRAY_UTC_INJECTED, query2, params2 ] = await this.determineSource(grid.id, xDaysAgoUTC, twoDaysAgoUTC, params.load_forecast_fs_source, MIN_CONSUMPTION_KWH_THRESHOLD, MAX_CONSUMPTION_KWH_THRESHOLD, MIN_CONSUMPTION_KWH_TO_DETERMINE_MIN_HOURLY_CONSUMPTION, 'FS');
      [ PRODUCTION_ARRAY_UTC_INJECTED, query3, params3 ] = await this.getHourlyProductionForecastByGridId(grid.id, nextHalfHourUTC, tomorrowUTC);
    }
    catch (dbErr) {
      console.error('Autopilot: DB unavailable for data fetch, solver will use DEFAULT arrays:', dbErr.message);
    }

    const queries = [
      {
        name: 'hps_consumption_array_injection',
        query: query1,
        params: params1,
        templated: this.substitutePlaceholders(query1, params1),
        result: HPS_CONSUMPTION_ARRAY_UTC_INJECTED,
      },
      {
        name: 'fs_consumption_array_injection',
        query: query2,
        params: params2,
        templated: this.substitutePlaceholders(query2, params2),
        result: FS_CONSUMPTION_ARRAY_UTC_INJECTED,
      },
      {
        name: 'production_array_injection',
        query: query3,
        params: params3,
        templated: this.substitutePlaceholders(query3, params3),
        result: PRODUCTION_ARRAY_UTC_INJECTED,
      },
    ];
    try {
      const codeString = await this.get();

      // Transform all import statements into require
      let transformedCode = codeString.replace(
        /import\s+((\w+)|\{[^}]+\})\s+from\s+['"]([^'"]+)['"];?/g,
        (___, vars, defaultVar, moduleName) => {
          if (defaultVar) {
            return `const ${ defaultVar } = require('${ moduleName }');`;
          }
          return `const ${ vars } = require('${ moduleName }');`;
        },
      );

      // INJECTION OF REAL VALUES
      transformedCode = this.overrideVariableInitialization(transformedCode, 'SOC_INJECTED', soc.rawValue / 100);
      transformedCode = this.overrideVariableInitialization(transformedCode, 'FS_START_INDEX_INJECTED', params.fs_start_index);
      transformedCode = this.overrideVariableInitialization(transformedCode, 'FS_STOP_INDEX_INJECTED', params.fs_stop_index);
      transformedCode = this.overrideVariableInitialization(transformedCode, 'GRID_INJECTED', grid);
      transformedCode = this.overrideVariableInitialization(transformedCode, 'CURRENT_FS_STATE_INJECTED', grid.is_fs_on || false);
      transformedCode = this.overrideVariableInitialization(transformedCode, 'NOW_PARTS_INJECTED', nowParts);
      transformedCode = this.overrideVariableInitialization(transformedCode, 'PRODUCTION_ARRAY_UTC_INJECTED', PRODUCTION_ARRAY_UTC_INJECTED);
      transformedCode = this.overrideVariableInitialization(transformedCode, 'FS_CONSUMPTION_ARRAY_UTC_INJECTED', FS_CONSUMPTION_ARRAY_UTC_INJECTED);
      transformedCode = this.overrideVariableInitialization(transformedCode, 'HPS_CONSUMPTION_ARRAY_UTC_INJECTED', HPS_CONSUMPTION_ARRAY_UTC_INJECTED);

      transformedCode = this.overrideVariableInitialization(transformedCode, 'CURRENT_HPS_STATE_INJECTED', grid.is_hps_on || false);
      transformedCode = this.overrideVariableInitialization(transformedCode, 'FS_TOGGLE_ARRAY_INJECTED', params.fs_toggle_array_injected);
      transformedCode = this.overrideVariableInitialization(transformedCode, 'HPS_TOGGLE_ARRAY_INJECTED', params.hps_toggle_array_injected);
      transformedCode = this.overrideVariableInitialization(transformedCode, 'PERIOD_START_INJECTED', params.period_start_injected);

      const res = eval(transformedCode);
      this.storeToDatabase(transformedCode, params, res, queries);
      return res;
    }
    catch (err) {
      console.error('Error during instrumentation:', err.message);
      return {};
    }
  }

  async storeToDatabase(code: string, params, output: any, queries) {
    const supabase: SupabaseClient = this.supabaseService.adminClient;
    const { error } = await supabase
      .from('autopilot_executions')
      .insert([
        { code: code, input: params, output: output, queries: queries },
      ])
      .select();

    if (error) console.error('Error storing to database', error);
  }

  substitutePlaceholders(template: string, params: any[]): string {
    return template.replace(/\$(\d+)/g, (match, group) => {
      const index = parseInt(group, 10) - 1; // Convert $1 -> index 0, $2 -> index 1, etc.
      return params[index] !== undefined ? params[index] : match; // Replace or keep the placeholder if no match
    });
  }
}
