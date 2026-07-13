import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class HeartbeatService {
  private readonly logger = new Logger(HeartbeatService.name);
  @Interval(30_000)
  handleHeartbeat(): void {
    this.logger.log('heartbeat');
  }
}
