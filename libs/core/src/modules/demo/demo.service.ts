import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

@Injectable()
export class DemoService implements OnModuleInit {
  private readonly logger = new Logger(DemoService.name);

  onModuleInit(): void {
    this.logger.log('demo capability loaded (capabilities.demo.enabled=true)');
  }
}
