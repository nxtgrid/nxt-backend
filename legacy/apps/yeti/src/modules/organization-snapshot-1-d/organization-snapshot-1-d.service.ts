import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import moment from 'moment';
import { PgService } from '@core/modules/core-pg';
import { RAW_QUERIES, GridCountByOrganization, GridCountByOrganizationParams } from '@yeti/queries';
import { OrganizationSnapshot1D } from '@timeseries/entities/organization-snapshot-1-d.entity';

@Injectable()
export class OrganizationSnapshot1DService {
  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
    private readonly pgService: PgService,
  ) {}

  isSnapshottingOrganizations = false;

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { disabled: process.env.NXT_ENV !== 'production' })
  async createOrganizationSnapshots() {
    if (this.isSnapshottingOrganizations) return;
    this.isSnapshottingOrganizations = true;

    try {
      // The snapshots refer to the end of the previous day, so timestamp is the beginning of yesterday.
      const created_at = moment().subtract(1, 'day').startOf('day').toDate();
      const orgsWithGridCount = await this.getOrganizationsWithGridCount();

      const toInsert: OrganizationSnapshot1D[] = orgsWithGridCount
        .map(({ organization_id, organization_name, grid_count }) => ({
          created_at,
          organization_id,
          organization_name,
          grid_count,
        }))
      ;

      await this.timescale
        .createQueryBuilder()
        .insert()
        .into(OrganizationSnapshot1D)
        .values(toInsert)
        .orIgnore() // Ignore duplicates
        .execute()
        .catch(console.error);
    }
    catch (err) {
      console.error('[ORGANIZATION SNAPSHOT 1D] General error', err);
    }
    finally {
      this.isSnapshottingOrganizations = false;
    }
  }

  private async getOrganizationsWithGridCount() {
    const params: GridCountByOrganizationParams = [ false ];
    return this.pgService.query<GridCountByOrganization>(
      RAW_QUERIES.sql.supabase.organizationSnapshot1D.findGroupedByOrganization,
      params,
    );
  }
}
