import { Body, Controller, Param, Post, Put, /* Query, */ UseGuards } from '@nestjs/common';
import { DcusService } from './dcus.service';
import { UpdateDcuInput } from '@core/modules/dcus/dto/update-dcu.input';
import { CurrentUser, NxtSupabaseUser } from '../auth/nxt-supabase-user';
import { CreateDcuFromInventory } from './dto/create-dcu-from-inventory';
import { CreateDcuInput } from '@core/modules/dcus/dto/create-dcu.input';
import { AuthenticationGuard } from '../auth/authentication.guard';

@Controller('dcus')
@UseGuards(AuthenticationGuard)
export class DcusController {
  constructor(
    protected readonly service: DcusService,
  ) { }

  // Called by Talos to notify that the DCU uninstall has been completed.
  // We need this to unhook the DCU from its DCU
  @Put()
  async updateMany(
    @Body() body: UpdateDcuInput[],
  ) {
    return this.service.updateMany(body);
  }

  // This endpoint is used by insert-from-google-sheets to add new DCUs to the database.
  // It's going to be triggered via Make, which listens to rows at
  // https://docs.google.com/spreadsheets/d/1DYYXbLYKhtATHR0yJJpXZwwYVWXFFT3WtTF_vf-9AwY/edit?gid=1249008349#gid=1249008349
  // and sends individual DCU info every time a new meter is added
  @Post('insert-from-inventory')
  addFromInventory(
    @Body() body: CreateDcuFromInventory,
  ) {
    return this.service.handleNewDcuEventFromInventory(body);
  }

  @Post('assign')
  assign(
    @Body() body: CreateDcuInput,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.assignToGrid(body, user);
  }


  @Put('unassign/:id')
  unassign(
    @Param('id') id: number,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.unassign(id, user);
  }
}
