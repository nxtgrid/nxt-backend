// import 'multer'; // @HACK :: Prevent typechecker errors

/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {});
  const port = Number(process.env.NXT_PORT);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: false } }));
  await app.listen(port);
}

bootstrap();
