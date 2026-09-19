import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';

async function exportSwagger() {
  console.log('Generating Swagger OpenAPI JSON specification...');
  const app = await NestFactory.create(AppModule, { logger: false });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('TikTok to Bitrix24 Integration API')
    .setDescription(
      'API documentation for TikTok Lead Generation & Bitrix24 CRM Synchronization',
    )
    .setVersion('1.0.0')
    .addTag('Webhooks', 'TikTok and Bitrix24 inbound webhooks')
    .addTag('Management', 'Leads, Deals, Configuration and Queue management')
    .addTag('Analytics', 'Conversion rates, campaign performance, and reporting')
    .addTag('Health', 'System health checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const outputPath = path.join(docsDir, 'swagger.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');

  // Also write to project root for easy access
  const rootOutputPath = path.join(process.cwd(), 'swagger.json');
  fs.writeFileSync(rootOutputPath, JSON.stringify(document, null, 2), 'utf-8');

  console.log(`✅ Swagger JSON exported successfully to:`);
  console.log(` - ${outputPath}`);
  console.log(` - ${rootOutputPath}`);

  await app.close();
  process.exit(0);
}

exportSwagger().catch((err) => {
  console.error('Failed to export Swagger JSON:', err);
  process.exit(1);
});
