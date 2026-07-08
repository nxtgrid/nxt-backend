import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { CreateConnectionDto } from '@core/modules/connections/dto/create-connection.dto';
import { UpdateConnectionRequestedMetersDto } from './dto/update-connection-requested-meters.dto';
import { UpdateConnection } from '@core/types/supabase-types';

@UseGuards(AuthenticationGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(protected readonly service: ConnectionsService) { }

  @Post()
  create(
    @Body() body: CreateConnectionDto,
  ) {
    console.info(`
      ==================================
      CREATE CONNECTIONS WAS CALLED WITH:
      ==================================
    `, body);
    return this.service.create(body);
  }

  @Post('upsert-requested-meters')
  updateRequestedMeters(
    @Body() body: UpdateConnectionRequestedMetersDto,
  ) {
    return this.service.updateRequestedMeters(body);
  }

  @Patch()
  updateMany(
    @Body() body: UpdateConnection[],
  ) {
    console.info(`
      ==================================
      PATCH CONNECTIONS WAS CALLED WITH:
      ==================================
    `, body);
    return this.service.updateMany(body);
  }
}
