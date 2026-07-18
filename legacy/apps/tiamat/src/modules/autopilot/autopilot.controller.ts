import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AutopilotService } from './autopilot.service';
import { AuthenticationGuard } from '../auth/authentication.guard';

@UseGuards(AuthenticationGuard)
@Controller('autopilot')
export class AutopilotController {
  constructor(private readonly autopilot: AutopilotService) { }

  @Post()
  run(@Body() body: any) {
    return this.autopilot.eval(body);
  }
}
