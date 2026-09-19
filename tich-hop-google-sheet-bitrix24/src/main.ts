import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Bitrix24 & Google Sheets Sync API')
    .setDescription(
      'Hệ thống tự động hóa đồng bộ dữ liệu hai chiều giữa Google Sheets và Bitrix24 CRM',
    )
    .setVersion('2.0')
    .addTag('sync')
    .addTag('webhook')
    .addTag('admin')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`========================================================`);
  logger.log(`🚀 Ứng dụng Sync Hub đang chạy tại: http://localhost:${port}`);
  logger.log(`📊 Web Admin Dashboard:             http://localhost:${port}/admin`);
  logger.log(`📖 Swagger API Docs:                http://localhost:${port}/api/docs`);
  logger.log(`🔗 Bitrix24 Webhook Endpoint:       http://localhost:${port}/api/webhook/bitrix24`);
  logger.log(`========================================================`);
}

bootstrap();
