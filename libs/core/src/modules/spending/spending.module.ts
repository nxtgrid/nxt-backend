import { Global, Module } from '@nestjs/common';
import { SpendingService } from './spending.service';

@Global()
@Module({
  providers: [ SpendingService ],
  exports: [ SpendingService ],
})
export class CoreSpendingModule {}
