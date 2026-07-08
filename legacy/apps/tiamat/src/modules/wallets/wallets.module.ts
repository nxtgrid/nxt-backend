import { Global, Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from '@core/modules/wallets/entities/wallet.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Wallet ]) ],
  providers: [ WalletsService ],
  exports: [ WalletsService ],
})
export class WalletsModule { }
