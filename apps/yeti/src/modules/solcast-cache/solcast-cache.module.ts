import { Global, Module } from '@nestjs/common';
import { SolcastCacheService } from './solcast-cache.service';
import { SolcastCache } from '@core/modules/solcast-cache/entities/solcast-cache.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Global()
  @Module({
    imports: [ TypeOrmModule.forFeature([ SolcastCache ]) ],
    providers: [ SolcastCacheService ],
    exports: [ SolcastCacheService ],
  })
export class SolcastCacheModule {}
