import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadConfig } from '@nxt/core';

async function bootstrap() {
  // Config must be loaded before AppModule is imported: its capability contribution
  // functions run at module-decoration time, which a static import would otherwise
  // evaluate before this line runs (ADR-007 decision 3).
  loadConfig();
  const { AppModule } = await import('./modules/app.module.js');

  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${ port }`);
}

bootstrap();
