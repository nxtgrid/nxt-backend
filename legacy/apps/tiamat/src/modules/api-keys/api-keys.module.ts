import { Global, Module } from '@nestjs/common';
import { ApiKeysService } from '@core/modules/api-keys/api-keys.service';
import { ApiKey } from '@core/modules/api-keys/entities/api-key.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ ApiKey ]) ],
  providers: [ ApiKeysService ],
  exports: [ ApiKeysService ],
})
export class ApiKeysModule {}
