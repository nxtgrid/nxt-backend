import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '@core/modules/accounts/entities/account.entity';
import { AccountsService } from '@core/modules/accounts/accounts.service';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Account ]) ],
  providers: [ AccountsService ],
  exports: [ AccountsService ],
})
export class AccountsModule { }
