import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Needed for TikTok webhook HMAC signature verification
  });

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('TikTok to Bitrix24 Integration API')
    .setDescription(
      'API documentation for TikTok Lead Generation & Bitrix24 CRM Synchronization',
    )
    .setVersion('1.0.0')
    .addTag('Webhooks', 'TikTok and Bitrix24 inbound webhooks')
    .addTag('Management', 'Leads, Deals and Configuration management')
    .addTag('Analytics', 'Conversion rates, campaign performance, and reporting')
    .addTag('Health', 'System health checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  try {
    const fs = await import('fs');
    const path = await import('path');
    const docsDir = path.join(process.cwd(), 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(docsDir, 'swagger.json'),
      JSON.stringify(document, null, 2),
      'utf-8',
    );
  } catch (err) {
    logger.warn(
      `Could not export swagger.json on startup: ${(err as Error).message}`,
    );
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Server is running on http://localhost:${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
