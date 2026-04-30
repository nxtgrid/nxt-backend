import { Global, Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { Order } from '@core/modules/orders/entities/order.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Order ]) ],
  providers: [ OrdersService ],
  controllers: [ OrdersController ],
  exports: [ OrdersService ],
})
export class OrdersModule { }
