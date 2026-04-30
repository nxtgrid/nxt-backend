import { Controller, Get } from '@nestjs/common';
import { PdHeroService } from './pd-hero.service';

// TODO: security
@Controller('pd-hero')
export class PdHeroController {
  constructor(
    private readonly pdHeroService: PdHeroService,
  ) { }

  @Get('run')
  run() {
    return this.pdHeroService.run();
  }
}
