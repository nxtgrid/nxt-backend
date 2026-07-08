import { Global, Module } from '@nestjs/common';
import { SendgridController } from './sendgrid.controller';
import { SendgridService } from './sendgrid.service';

@Global()
@Module({
  controllers: [ SendgridController ],
  providers: [ SendgridService ],
  exports: [ SendgridService ],
})
export class SendgridModule {}
