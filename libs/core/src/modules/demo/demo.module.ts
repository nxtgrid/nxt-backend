import { Module } from '@nestjs/common';

import { DemoService } from './demo.service.js';

/**
 * Temporary demo capability — see `demo.schema.ts`.
 */
@Module({
  providers: [ DemoService ],
})
export class DemoModule {}
