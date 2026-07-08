import { Body, Controller, Get, Param, Put, StreamableFile, UseGuards } from '@nestjs/common';
import { GridsService } from './grids.service';
import { UpdateGridInput } from '@core/modules/grids/dto/update-grid.input';
import { DownloadService } from '../download/download.service';
// import { CurrentUser, NxtSupabaseUser } from '../auth/nxt-supabase-user';
import { AuthenticationGuard } from '../auth/authentication.guard';

@UseGuards(AuthenticationGuard)
@Controller('grids')
export class GridsController {
  constructor(
    protected readonly service: GridsService,
    protected readonly downloadService: DownloadService,
  ) {}

  // Called by Yeti when done updating the DCU status, the MPPT info and the grid's diagnostics
  @Put()
  updateGrids(@Body() body: UpdateGridInput[]) {
    return this.service.updateMany(body);
  }

  @Get('/:id/pbg-connections/download')
  async downloadPbgConnections(@Param('id') gridId: number): Promise<StreamableFile> {
    const file = await this.downloadService.prepareGridPbgConnectionFile(gridId);
    return new StreamableFile(file);
  }

  // Used by Google App Script
  @Get('/:id/metering_hardware_connectivity_stats')
  async getConnectivityStatsByGridId(@Param('id') gridId: number): Promise<any> {
    return this.service.getMeteringHardwareConnectivityStatsByGridId(gridId);
  }

  // This is used by Flow XO to look for grids
  @Get(':id')
  getGrid(@Param('id') id) {
    return this.service.findOne(id);
  }
}
