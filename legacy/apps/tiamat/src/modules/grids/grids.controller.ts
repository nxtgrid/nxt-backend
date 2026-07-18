import { Body, Controller, Get, Param, Put, StreamableFile, UseGuards } from '@nestjs/common';
import { GridsService } from './grids.service';
import { UpdateGridInput } from '@core/modules/grids/dto/update-grid.input';
import { DownloadService } from '../download/download.service';
import { AuthenticationGuard } from '../auth/authentication.guard';

/**
 * 002d Task 11: `GET /grids/:id` (Flow XO) removed — not ported to OSS Foundation.
 * Remaining routes stay until their owning capabilities absorb them (Metering / download).
 */
@UseGuards(AuthenticationGuard)
@Controller('grids')
export class GridsController {
  constructor(
    protected readonly service: GridsService,
    protected readonly downloadService: DownloadService,
  ) {}

  // Called by Yeti when done updating the DCU status, the MPPT info and the grid's diagnostics
  // (loch weather also PUTs here under the legacy api-only ops-DB write funnel — dropped in OSS)
  @Put()
  updateGrids(@Body() body: UpdateGridInput[]) {
    return this.service.updateMany(body);
  }

  @Get('/:id/pbg-connections/download')
  async downloadPbgConnections(@Param('id') gridId: number): Promise<StreamableFile> {
    const file = await this.downloadService.prepareGridPbgConnectionFile(gridId);
    return new StreamableFile(file);
  }

  // Used by Google App Script — re-home to Metering (ADR-013)
  @Get('/:id/metering_hardware_connectivity_stats')
  async getConnectivityStatsByGridId(@Param('id') gridId: number): Promise<any> {
    return this.service.getMeteringHardwareConnectivityStatsByGridId(gridId);
  }
}
