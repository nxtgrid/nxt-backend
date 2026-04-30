import { Body, Controller, Post } from '@nestjs/common';
import { AutopilotService } from './autopilot.service';
import { AutopilotMatrixInput } from './dto/autopilot.matrix.input';

@Controller('autopilot')
export class AutopilotController {
  constructor(
    private readonly autopilotService: AutopilotService,
  ) { }

  @Post('test')
  test(
    @Body() autopilotMatrixInput: AutopilotMatrixInput,
  ) {
    return this.autopilotService.findBestSolution(autopilotMatrixInput);
  }
}
