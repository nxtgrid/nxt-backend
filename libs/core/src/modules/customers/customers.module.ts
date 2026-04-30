import { Global, Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Customer ]) ],
  providers: [ CustomersService ],
  exports: [ CustomersService ],
})
export class CoreCustomersModule { }
