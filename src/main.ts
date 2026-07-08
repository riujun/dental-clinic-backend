// DONE: Paso 2 - bootstrap: prefijo /api, CORS desde env, validación global de DTOs
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.get<string>('CORS_ORIGIN'), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta propiedades no declaradas en el DTO
      transform: true, // convierte tipos según el DTO (class-transformer)
    }),
  );

  await app.listen(config.get<number>('PORT') ?? 4000);
}
void bootstrap();
