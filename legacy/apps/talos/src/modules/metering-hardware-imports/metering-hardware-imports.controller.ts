import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { MeteringHardwareImportsService } from './metering-hardware-imports.service';
import { CreateMeteringHardwareImportInput } from '@core/modules/metering-hardware-imports/dto/create-metering-hardware-import.input';

@Controller('metering-hardware-imports')
export class MeteringHardwareImportsController {
  constructor(
    private readonly meteringHardwareImportsService: MeteringHardwareImportsService,
  ) { }

  @Post()
  create(@Body() body: CreateMeteringHardwareImportInput[]): Promise<any[]> {
    return this.meteringHardwareImportsService.create(body);
  }

  @Put()
  updateMany(@Body() body: CreateMeteringHardwareImportInput[]): Promise<any[]> {
    return this.meteringHardwareImportsService.updateMany(body);
  }

  @Get('run')
  run(): Promise<void> {
    this.meteringHardwareImportsService.installLoop();
    return;
  }
}
