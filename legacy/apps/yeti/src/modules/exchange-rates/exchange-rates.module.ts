import { Global, Module } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';

@Global()
@Module({
  providers: [ ExchangeRatesService ],
  exports: [ ExchangeRatesService ],
})
export class ExchangeRatesModule {}
