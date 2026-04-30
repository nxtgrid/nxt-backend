import { Global, Module } from '@nestjs/common';
import { UssdSessionsService } from './ussd-sessions.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UssdSession } from '@core/modules/ussd-sessions/entities/ussd-session.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ UssdSession ]) ],
  providers: [ UssdSessionsService ],
  exports: [ UssdSessionsService ],
})
export class UssdSessionsModule { }
