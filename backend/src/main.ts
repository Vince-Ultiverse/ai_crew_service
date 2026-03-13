import { NestFactory } from '@nestjs/core';
import dotenv from 'dotenv';
dotenv.config();
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableCors();
  await app.listen(process.env.PORT || 3000);
  console.log(`AI Crew backend running on port ${process.env.PORT || 3000}`);
}
bootstrap();
