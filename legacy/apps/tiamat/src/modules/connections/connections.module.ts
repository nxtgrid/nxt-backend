import { Global, Module } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from '@core/modules/connections/entities/connection.entity';
import { ConnectionsController } from './connections.controller';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Connection ]) ],
  providers: [ ConnectionsService ],
  exports: [ ConnectionsService ],
  controllers: [ ConnectionsController ],
})
export class ConnectionsModule { }
