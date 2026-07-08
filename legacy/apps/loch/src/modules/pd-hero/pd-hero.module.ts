import { Module } from '@nestjs/common';
import { PdHeroService } from './pd-hero.service';
import { PdHeroController } from './pd-hero.controller';

@Module({
  providers: [ PdHeroService ],
  controllers: [ PdHeroController ],
})
export class PdHeroModule {}
