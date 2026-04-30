import { Module } from '@nestjs/common';
import { ChirpstackController } from './chirpstack.controller';
import { ChirpStackService } from './chirpstack.service';

@Module({
  controllers: [ ChirpstackController ],
  providers: [ ChirpStackService ],
})
export class ChirpstackModule {}
