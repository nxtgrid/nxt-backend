import { Global, Module } from '@nestjs/common';
import { NotificationParametersService } from './notification-parameters.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationParameter } from '@core/modules/notification-parameters/entities/notification-parameter.entity';

@Global()
  @Module({
    imports: [
      TypeOrmModule.forFeature([ NotificationParameter ]),
    ],
    providers: [ NotificationParametersService ],
    exports: [ NotificationParametersService ],
  })
export class NotificationParametersModule {}
