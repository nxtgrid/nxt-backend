import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Router } from '@core/modules/routers/entities/router.entity';
import { RoutersService } from '@core/modules/routers/routers.service';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Router ]) ],
  providers: [ RoutersService ],
  exports: [ RoutersService ],
})
export class RoutersModule { }
