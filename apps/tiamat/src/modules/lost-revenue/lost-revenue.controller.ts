import { Controller, Get, /*UseGuards,*/ Param } from '@nestjs/common';
// import { AuthenticationGuard } from '../auth/authentication.guard';
import { LostRevenueService } from './lost-revenue.service';

@Controller('lost-revenue')
export class LostRevenueController {
  constructor(private readonly lostRevenueService: LostRevenueService) { }

  // @UseGuards(AuthenticationGuard)
  @Get(':id')
  async getLostRevenue(@Param('id') id: number) {
    return await this.lostRevenueService.calcTotalLostRevenueByMeterType(id);
  }
}
