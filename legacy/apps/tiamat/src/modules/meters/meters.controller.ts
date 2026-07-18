import { Body, Controller, Get, HttpException, Param, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { MetersService } from './meters.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { CreateMeterFromInventoryDto } from './dto/create-meter-from-inventory.dto';
import { CurrentUser, NxtSupabaseUser } from '../auth/nxt-supabase-user';
import { AssignMeterDto } from './dto/assign-meter.dto';
import { ApiTokenDeliveryDto } from './dto/token-delivery.dto';
import { ApiTokenGenerationDto } from './dto/token-generation.dto';

@Controller('meters')
export class MetersController {
  constructor(
    private readonly service: MetersService,
  ) {}

  @Post('assign-one')
  @UseGuards(AuthenticationGuard)
  assign(
    @Body() body: AssignMeterDto,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.assignMeter(body, user);
  }

  @Post(':id/unassign')
  @UseGuards(AuthenticationGuard)
  startUnassignment(
    @Param('id') id: number,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.startMeterUnassignment(id, user);
  }

  // Used by Flow XO to search for a meter that can be topped up
  @Get('search')
  async search(
    @Query('search') input: string,
  ) {
    const meter: Meter = await this.service.findByExternalReference(input);
    if (!this.service.isReadyToBeToppedUp(meter as any)) throw new HttpException(`Meter ${ input } not found or ready for use`, 404);

    return meter;
  }

  @UseGuards(AuthenticationGuard)
  @Post('offline-clear-tamper-tokens')
  @UseInterceptors(FileInterceptor('file'))
  async getClearTamperTokens(
    @UploadedFile() uploadedFile: Express.Multer.File,
    @Res({ passthrough: true }) res,
  ) {
    // We wait for the imports to be added, not to be processed
    const filePath = await this.service.getOfflineClearTamperTokens(uploadedFile);

    const file = createReadStream(filePath);
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${ filePath }"`,
    });
    return new StreamableFile(file);
  }

  @UseGuards(AuthenticationGuard)
  @Post('testing/import')
  @UseInterceptors(FileInterceptor('file'))
  async importTestMeters(
    @UploadedFile() uploadedFile: Express.Multer.File,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    // We wait for the imports to be added, not to be processed
    return this.service.importTestMeters(uploadedFile, user);
  }

  @UseGuards(AuthenticationGuard)
  @Post(':external_reference/tokens/generate')
  async meterTokenGeneration(
    @Param('external_reference') external_reference: string,
    @Body() body: ApiTokenGenerationDto,
  ) {
    return this.service.generateToken(external_reference, body);
  }

  @UseGuards(AuthenticationGuard)
  @Post(':external_reference/tokens/deliver')
  async meterTokenDelivery(
    @Param('external_reference') external_reference: string,
    @Body() body: ApiTokenDeliveryDto,
  ) {
    return this.service.deliverPreexistingToken(external_reference, body.token);
  }

  // This endpoint is used by insert-from-google-sheets to add new meters to the database. It's going to be
  // triggered via Make, which listens to rows at a specific Google sheet.
  // and sends individual meter info every time a new meter is added
  @UseGuards(AuthenticationGuard)
  @Post('insert-from-inventory')
  async meterAddFromInventory(
    @Body() body: CreateMeterFromInventoryDto,
  ) {
    return this.service.handleNewMeterEventFromInventory(body);
  }
}
