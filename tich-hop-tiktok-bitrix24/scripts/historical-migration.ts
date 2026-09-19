import axios from 'axios';

interface HistoricalLead {
  event: string;
  event_id: string;
  timestamp: number;
  advertiser_id: string;
  campaign: {
    campaign_id: string;
    campaign_name: string;
    ad_id: string;
    ad_name: string;
  };
  form: {
    form_id: string;
    form_name: string;
  };
  lead_data: {
    full_name: string;
    email: string;
    phone: string;
    city: string;
    interests: string[];
    utm_source: string;
    utm_campaign: string;
    ttclid: string;
  };
  custom_questions: Array<{ question: string; answer: string }>;
}

async function runHistoricalMigration() {
  const targetUrl =
    process.env.API_TARGET_URL || 'http://localhost:3000/api/v1/leads/batch';

  console.log('=== Khởi Chạy Tiến Trình Historical Data Migration ===');
  console.log(`Endpoint: ${targetUrl}`);

  // Generate 5 realistic historical leads
  const historicalLeads: HistoricalLead[] = [
    {
      event: 'lead.generate',
      event_id: `hist_evt_01_${Date.now()}`,
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 5,
      advertiser_id: '7123456789',
      campaign: {
        campaign_id: 'camp_001_historical',
        campaign_name: 'Historical Mega Sale 2024',
        ad_id: 'ad_001',
        ad_name: 'Short Video Promo 1',
      },
      form: {
        form_id: 'form_hist_01',
        form_name: 'Đăng Ký Tư Vấn Bất Động Sản',
      },
      lead_data: {
        full_name: 'Trần Văn Bảo',
        email: `tranvanbao_${Date.now()}@example.com`,
        phone: '0912345678',
        city: 'Hà Nội',
        interests: ['bất động sản', 'đầu tư'],
        utm_source: 'tiktok',
        utm_campaign: 'historical_sale_2024',
        ttclid: 'TT-hist-001-xyz',
      },
      custom_questions: [
        { question: 'Ngân sách dự kiến', answer: '2-3 tỷ VND' },
        { question: 'Thời gian mua', answer: 'Trong 1 tháng' },
      ],
    },
    {
      event: 'lead.generate',
      event_id: `hist_evt_02_${Date.now()}`,
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 4,
      advertiser_id: '7123456789',
      campaign: {
        campaign_id: 'camp_002_historical',
        campaign_name: 'Khoá Học Lập Trình Fullstack',
        ad_id: 'ad_002',
        ad_name: 'Review Học Viên',
      },
      form: {
        form_id: 'form_hist_02',
        form_name: 'Form Đăng Ký Học Bổng',
      },
      lead_data: {
        full_name: 'Lê Thị Thu',
        email: `lethithu_${Date.now()}@example.com`,
        phone: '0987654321',
        city: 'TP. Hồ Chí Minh',
        interests: ['công nghệ', 'lập trình web'],
        utm_source: 'tiktok',
        utm_campaign: 'hoc_bong_2024',
        ttclid: 'TT-hist-002-abc',
      },
      custom_questions: [
        { question: 'Budget', answer: '15 triệu' },
        { question: 'Timeline', answer: 'Ngay trong tuần' },
      ],
    },
    {
      event: 'lead.generate',
      event_id: `hist_evt_03_${Date.now()}`,
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 3,
      advertiser_id: '7123456789',
      campaign: {
        campaign_id: 'camp_001_historical',
        campaign_name: 'Historical Mega Sale 2024',
        ad_id: 'ad_003',
        ad_name: 'KOL Livestream Cut',
      },
      form: {
        form_id: 'form_hist_01',
        form_name: 'Đăng Ký Tư Vấn Bất Động Sản',
      },
      lead_data: {
        full_name: 'Phạm Đức Hoàng',
        email: `phamduchoang_${Date.now()}@example.com`,
        phone: '0909888999',
        city: 'Đà Nẵng',
        interests: ['du lịch', 'nghỉ dưỡng'],
        utm_source: 'tiktok',
        utm_campaign: 'historical_sale_2024',
        ttclid: 'TT-hist-003-dfg',
      },
      custom_questions: [
        { question: 'Dự toán', answer: '5-10 tỷ' },
        { question: 'Tiến độ', answer: 'Trong quý này' },
      ],
    },
  ];

  try {
    const startTime = Date.now();
    const response = await axios.post(targetUrl, { leads: historicalLeads }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    const elapsed = Date.now() - startTime;

    console.log(`✅ Kết quả: ${response.status} ${response.statusText} (${elapsed}ms)`);
    console.log('Phản hồi server:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    console.error(
      `❌ Lỗi Migration: ${error.response?.status || 'Network Error'} - ${
        error.response?.data?.message || error.message
      }`,
    );
    throw error;
  }
}

if (require.main === module) {
  runHistoricalMigration().catch(() => process.exit(1));
}

export { runHistoricalMigration };
