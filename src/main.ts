import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS — allow configured origin (or all in dev)
  app.enableCors({
    origin: process.env.APP_ORIGIN ?? '*',
    credentials: true,
  });

  // Global API prefix
  app.setGlobalPrefix('api');

  // Input validation & DTO auto-transform
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // strip unknown properties
      forbidNonWhitelisted: true, // reject requests with unknown props
      transform: true,            // auto-cast primitives to DTO types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
