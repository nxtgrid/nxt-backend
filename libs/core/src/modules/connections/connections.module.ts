import { Global, Module } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Connection } from './entities/connection.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Connection ]) ],
  providers: [ ConnectionsService ],
  exports: [ ConnectionsService ],
})
export class CoreConnectionsModule { }
