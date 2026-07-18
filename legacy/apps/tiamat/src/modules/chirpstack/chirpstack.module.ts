import { Module } from '@nestjs/common';
import { ChirpstackController } from './chirpstack.controller';

@Module({
  controllers: [ ChirpstackController ],
})
export class ChirpstackModule {}
