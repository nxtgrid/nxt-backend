import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { loadConfig } from '@nxt/core/config';

async function bootstrap() {
  // Config subpath has no Nest module side effects. loadConfig before NestFactory.create
  // so forRootAsync factories / providers can call getConfig() (ADR-007 decision 3).
  loadConfig();
  const { AppModule } = await import('./modules/app.module.js');

  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${ port }`);
}

bootstrap();
