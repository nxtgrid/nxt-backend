import { Global, Module } from '@nestjs/common';
import { MeteringHardwareImportsService } from './metering-hardware-imports.service';
import { MeteringHardwareImportsController } from './metering-hardware-imports.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeteringHardwareImport } from '@core/modules/metering-hardware-imports/entities/metering-hardware-import.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ MeteringHardwareImport ]) ],
  providers: [ MeteringHardwareImportsService ],
  controllers: [ MeteringHardwareImportsController ],
  exports: [ MeteringHardwareImportsService ],
})
export class MeteringHardwareImportsModule { }
