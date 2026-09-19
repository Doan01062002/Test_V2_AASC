import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as crypto from 'crypto';

describe('Webhooks & API Endpoints (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_WEBHOOK_SIGNATURE = 'false';
    process.env.TIKTOK_APP_SECRET = 'test_secret_e2e';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /dashboard', () => {
    it('should serve HTML dashboard page', async () => {
      const res = await request(app.getHttpServer()).get('/dashboard');
      expect(res.status).toBe(200);
      expect(res.text).toContain('TikTok Lead Generation & Bitrix24 Integration Dashboard');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('services');
    });
  });

  describe('POST /webhooks/tiktok/leads', () => {
    it('should reject webhook without signature', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/tiktok/leads')
        .send({ event: 'lead.generate' })
        .expect(401);
    });

    it('should accept webhook with valid HMAC-SHA256 signature', async () => {
      const payload = {
        event: 'lead.generate',
        event_id: `e2e_evt_${Date.now()}`,
        timestamp: Math.floor(Date.now() / 1000),
        lead_data: {
          full_name: 'E2E Test User',
          phone: '0901234567',
          email: 'e2e@test.com',
          city: 'Hà Nội',
        },
        campaign: {
          campaign_id: 'e2e_camp',
          campaign_name: 'E2E Sale Campaign',
        },
      };

      const payloadStr = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', 'test_secret_e2e')
        .update(payloadStr)
        .digest('hex');

      const res = await request(app.getHttpServer())
        .post('/webhooks/tiktok/leads')
        .set('TikTok-Signature', signature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.lead_id).toBeDefined();
    });
  });

  describe('Management Endpoints', () => {
    it('GET /api/v1/leads should return paginated leads', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/leads?page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
    });

    it('GET /api/v1/deals should return deals', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/deals?page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('GET /api/v1/config/mappings should return mappings', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/config/mappings');
      expect(res.status).toBe(200);
      expect(typeof res.body).toBe('object');
    });

    it('GET /api/v1/config/rules should return rules array', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/config/rules');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Analytics Endpoints', () => {
    it('GET /api/v1/analytics/conversion-rates', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/analytics/conversion-rates');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total_leads');
      expect(res.body).toHaveProperty('conversion_rate_lead_to_deal');
    });

    it('GET /api/v1/analytics/campaign-performance', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/analytics/campaign-performance');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/v1/reports/export?format=csv', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/reports/export?format=csv&date_range=30d');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text.startsWith('\uFEFF')).toBe(true); // UTF-8 BOM check
    });

    it('GET /api/v1/reports/export?format=json', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/reports/export?format=json&date_range=30d');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('leads');
      expect(res.body).toHaveProperty('summary');
    });

    it('GET /api/v1/reports/scheduled-summary', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/reports/scheduled-summary');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('report_type');
    });

    it('POST /api/v1/reports/trigger-alert', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/reports/trigger-alert');
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('alert_triggered');
    });
  });

  describe('Batch Leads Migration & DLQ Endpoints', () => {
    it('POST /api/v1/leads/batch should queue historical leads', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/leads/batch')
        .send({
          leads: [
            {
              event_id: `e2e_batch_01_${Date.now()}`,
              lead_data: { full_name: 'Batch Lead 1', email: 'batch1@test.com' },
            },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.queued).toBe(1);
    });

    it('GET /api/v1/queue/dlq should return DLQ job list', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/queue/dlq');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('queue');
    });

    it('POST /webhooks/tiktok/conversions should process conversion event', async () => {
      const res = await request(app.getHttpServer())
        .post('/webhooks/tiktok/conversions')
        .send({
          eventName: 'Purchase',
          value: 10000000,
          currency: 'VND',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.event).toBe('Purchase');
    });
  });
});
