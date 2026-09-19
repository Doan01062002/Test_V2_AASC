import axios from 'axios';
import * as crypto from 'crypto';

interface SendLeadOptions {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  campaignName?: string;
  budget?: string;
  timeline?: string;
}

async function sendMockTikTokWebhook(options: SendLeadOptions = {}) {
  const secret = process.env.TIKTOK_APP_SECRET || 'tiktok_secret_demo';
  const targetUrl =
    process.env.WEBHOOK_TARGET_URL ||
    'http://localhost:3000/webhooks/tiktok/leads';

  const timestamp = Math.floor(Date.now() / 1000);
  const eventId = `evt_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const payload = {
    event: 'lead.generate',
    event_id: eventId,
    timestamp: timestamp,
    advertiser_id: '7123456789',
    campaign: {
      campaign_id: '1234567890123456789',
      campaign_name: options.campaignName || 'Spring Sale 2024',
      ad_id: '9876543210987654321',
      ad_name: 'Product Demo Video',
    },
    form: {
      form_id: 'form_abc123',
      form_name: 'Contact Form',
    },
    lead_data: {
      full_name: options.name || 'Nguyễn Văn A',
      email: options.email || `nguyenvana_${Date.now()}@email.com`,
      phone: options.phone || '0901234567',
      city: options.city || 'Hà Nội',
      interests: ['technology', 'mobile apps'],
      utm_source: 'tiktok',
      utm_campaign: 'spring_sale_2024',
      ttclid: `TT-abc${Date.now()}xyz`,
    },
    custom_questions: [
      {
        question: 'Budget range',
        answer: options.budget || '5-10 triệu VND',
      },
      {
        question: 'Timeline',
        answer: options.timeline || 'Trong 1 tháng',
      },
    ],
  };

  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  console.log(`\n--- Sending Mock TikTok Webhook ---`);
  console.log(`Target URL: ${targetUrl}`);
  console.log(`Event ID:   ${eventId}`);
  console.log(`Lead Name:  ${payload.lead_data.full_name}`);
  console.log(`Signature:  ${signature}`);

  try {
    const startTime = Date.now();
    const response = await axios.post(targetUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'TikTok-Signature': signature,
      },
      timeout: 10000,
    });
    const elapsed = Date.now() - startTime;

    console.log(`Status:     ${response.status} ${response.statusText} (${elapsed}ms)`);
    console.log(`Response:  `, response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      `Error:      ${error.response?.status || 'Network Error'} - ${
        error.response?.data?.message || error.message
      }`,
    );
    throw error;
  }
}

// Execute CLI run
if (require.main === module) {
  sendMockTikTokWebhook({
    name: process.argv[2] || 'Nguyễn Văn A',
    phone: process.argv[3] || '0901234567',
    email: process.argv[4] || 'nguyenvana@email.com',
  }).catch(() => process.exit(1));
}

export { sendMockTikTokWebhook };
