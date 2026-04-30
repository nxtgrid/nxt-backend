import { Module } from '@nestjs/common';
import { RevenueUpdateService } from './revenue-update.service';

@Module({
  providers: [ RevenueUpdateService ],
})
export class RevenueUpdateModule {}
