import { Global, Module } from '@nestjs/common';
import { MongoAtlasService } from './mongo-atlas.service';

@Global()
@Module({
  providers: [ MongoAtlasService ],
  exports: [ MongoAtlasService ],
})
export class MongoAtlasModule {}
