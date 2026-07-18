import { Controller, Get, Param, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { MpptsService } from '@core/modules/mppts/mppts.service';
import { AuthenticationGuard } from '../auth/authentication.guard';

@Controller('mppts')
@UseGuards(AuthenticationGuard)
export class MpptsController {
  constructor(
    private readonly mpptsService: MpptsService,
  ) { }

  // This is called by Ayrton to trigger manual update of MPPT assets
  @Get('sync/:grid_id')
  async sync(
    @Param('grid_id') grid_id: number,
  ) {
    if(!grid_id) throw new UnprocessableEntityException('Grid ID is required');
    // We do not wait for the sync to end, since it's a long-running task
    this.mpptsService.syncGrid(grid_id);
    return { response: 'ok' };
  }
}
