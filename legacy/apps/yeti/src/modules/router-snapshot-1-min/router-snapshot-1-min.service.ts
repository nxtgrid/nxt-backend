import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ZerotierService } from '../zerotier/zerotier.service';
import { chunkifyArray } from '@helpers/array-helpers';
import { ZerotierDatapoint } from './types/zerotier-datapoint';
import { Router } from '@core/modules/routers/entities/router.entity';
import { RouterSnapshot1Min } from '@timeseries/entities/router-snapshot-1-min.entity';
import { uniq } from 'ramda';
import moment from 'moment';
import { RoutersService } from './routers.service';
import { CreateRouterInput } from '@core/modules/routers/dto/create-router.input';
import { UpdateRouterInput } from '@core/modules/routers/dto/update-router.input';
import { SupabaseService } from '@core/modules/supabase.module';

@Injectable()
export class RouterSnapshot1MinService {

  isRouterImportRunning = false;

  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
    private readonly routersService: RoutersService,
    private readonly zerotierService: ZerotierService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.NXT_ENV !== 'production' })
  async create() {
    if (this.isRouterImportRunning) return;
    this.isRouterImportRunning = true;

    try {
      const { adminClient: supabase, handleResponse } = this.supabaseService;
      // find all the grids to be able to do the mapping later on
      const grids = await supabase
        .from('grids')
        .select('id, name, organization:organizations(id, name)')
        .then(handleResponse);

      // fetch newest info from zerotier
      const nodesFromZerotierApi: ZerotierDatapoint[] = await this.zerotierService.getNodes();

      // turn it into a hashmap, so we avoid high complexity
      const nodesFromZerotierApiKeys = nodesFromZerotierApi.map(node => node.nodeId);

      // can load all dcus into memory for now, going to work for the next few thousands of grids
      const zerotierRoutersInDb: Router[] = await this.routersService.findByExternalSystem('ZEROTIER');

      // turn it into a hashmap, so we avoid high complexity and multiple fetches
      const nodesInDbHashmap = zerotierRoutersInDb.reduce((acc, curr) => {
        acc[curr.external_reference] = curr;
        return acc;
      }, {});

      // filter only the nodes we are interested in, namely the ones that have a grid name in their domain,
      // in the format <grid_name>.grids.nxtgrid.co , e.g. ogheye.grids.nxtgrid.co
      // for each one, fetch the corresponding grid from the grid hashmap
      const routersFromDbAndZerotierApiEnrichedWithDbValues = nodesFromZerotierApi
        .filter(node => node.description.match(/^[\w]+\.grids\.nxtgrid\.co$/))
        .map(node => {
          const dbRouter: Router = nodesInDbHashmap[node.nodeId];

          return {
            ...node,
            id: dbRouter?.id, //if the router is new, then this will stay undefined
            grid: dbRouter?.grid, //if the router is new, then this will stay undefined
          };
        });

      const routersToUpsert: CreateRouterInput[] = routersFromDbAndZerotierApiEnrichedWithDbValues
        .map(router => {
          const gridName = router.description.split('.')[0]; //if a node is changed, then the upsert will update the grid
          const dbGrid = grids.find(grid => grid.name.trim().toLowerCase() === gridName);
          return {
            external_system: 'ZEROTIER',
            external_reference: router.nodeId,
            is_online_updated_at: moment().toDate(),
            id: router.id, //this will be undefined in the case of a new node
            grid_id: dbGrid.id, //this will be allow a change of router in case its grid is changed
            is_online: moment(router.lastOnline).isAfter(moment().subtract(5, 'minute')),
          };
        });

      // we find the routers that are in db, but not in the api, and delete them
      const routersToRemoveFromDb: UpdateRouterInput[] = zerotierRoutersInDb
        .filter(router => !nodesFromZerotierApiKeys.includes(router.external_reference))
        .map(router => ({ id: router.id }));

      // delete routers from db via soft delete
      if (routersToRemoveFromDb.length > 0) await this.routersService.softDelete(routersToRemoveFromDb);

      // add routers to db
      if (routersToUpsert.length > 0) await this.routersService.upsert(routersToUpsert);

      // we need to refetch from database, since we need the id of the new rows, if any, to denormalize in timescale
      const updatedRoutersFromDb: Router[] = await this.routersService.findByExternalSystem('ZEROTIER');

      const updatedRoutersFromDbHashmap = updatedRoutersFromDb.reduce((acc, curr) => {
        acc[curr.external_reference] = curr;
        return acc;
      }, {});

      const datapoints: RouterSnapshot1Min[] = routersToUpsert.map(({ external_reference, is_online }) => {
        const dbRouter = updatedRoutersFromDbHashmap[external_reference];
        return {
          created_at: moment().second(0).millisecond(0).toDate(), //make the minute zero
          router_external_reference: dbRouter.external_reference,
          router_id: dbRouter.id,
          router_external_system: dbRouter.external_system,
          is_online,
          grid_id: dbRouter.grid?.id,
          grid_name: dbRouter.grid?.name,
          organization_id: dbRouter.grid?.organization?.id,
          organization_name: dbRouter.grid?.organization?.name,
        };
      });

      // insert into timescale
      const chunks = chunkifyArray(datapoints, 1000); //break into 1000 rows chunk
      chunks.forEach(this.insertChunk.bind(this));
    }
    catch (err) {
      console.error(err);
    }
    finally {
      this.isRouterImportRunning = false;
    }
  }

  insertChunk(chunk: RouterSnapshot1Min[]) {
    const propSet = chunk.reduce((acc, curr) => {
      acc.push(...Object.keys(curr));
      return acc;
    }, []);

    return this.timescale
      .createQueryBuilder()
      .insert()
      .into('router_snapshot_1_min',  uniq(propSet))
      .values(chunk)
      .orIgnore()
      .execute();
  }
}
