import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TikTokService } from './tiktok.service';
import { LeadEntity } from '../database/entities/lead.entity';
import { Repository } from 'typeorm';

describe('TikTokService', () => {
  let service: TikTokService;
  let leadRepo: Repository<LeadEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TikTokService,
        {
          provide: getRepositoryToken(LeadEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn((dto) => dto),
          },
        },
      ],
    }).compile();

    service = module.get<TikTokService>(TikTokService);
    leadRepo = module.get<Repository<LeadEntity>>(getRepositoryToken(LeadEntity));
  });

  describe('Phone Normalization', () => {
    it('should format Vietnamese phone numbers to +84 E.164 standard', () => {
      expect(service.normalizePhone('0901234567')).toBe('+84901234567');
      expect(service.normalizePhone('84901234567')).toBe('+84901234567');
      expect(service.normalizePhone('+84901234567')).toBe('+84901234567');
      expect(service.normalizePhone(' 098 765 4321 ')).toBe('+84987654321');
      expect(service.normalizePhone('032-123-4567')).toBe('+84321234567');
    });

    it('should validate phone formats accurately', () => {
      expect(service.isValidPhone('+84901234567')).toBe(true);
      expect(service.isValidPhone('12345')).toBe(false);
      expect(service.isValidPhone('')).toBe(false);
    });
  });

  describe('Email Normalization and Validation', () => {
    it('should lowercase and trim email', () => {
      expect(service.normalizeEmail('  NguyenVanA@Email.COM ')).toBe('nguyenvana@email.com');
    });

    it('should validate email format', () => {
      expect(service.isValidEmail('nguyenvana@email.com')).toBe(true);
      expect(service.isValidEmail('invalid-email')).toBe(false);
      expect(service.isValidEmail('')).toBe(false);
    });
  });

  describe('Lead Quality Scoring', () => {
    it('should calculate full 100 points for complete Hot Lead', () => {
      const data = {
        phone: '0901234567',
        email: 'test@example.com',
        city: 'Hà Nội',
        custom_questions: [
          { question: 'Budget range', answer: '5-10 triệu VND' },
          { question: 'Timeline', answer: 'Trong 1 tháng' },
        ],
      };

      const result = service.calculateQualityScore(data);
      expect(result.score).toBe(100);
      expect(result.classification).toBe('Hot');
    });

    it('should calculate 50 points (Warm Lead) with only phone and email', () => {
      const data = {
        phone: '0901234567',
        email: 'test@example.com',
      };

      const result = service.calculateQualityScore(data);
      expect(result.score).toBe(50);
      expect(result.classification).toBe('Warm');
    });

    it('should classify as Cold Lead when score is below 50', () => {
      const data = {
        email: 'test@example.com',
        city: 'Đà Nẵng',
      };

      const result = service.calculateQualityScore(data);
      expect(result.score).toBe(40); // 25 (email) + 15 (city)
      expect(result.classification).toBe('Cold');
    });
  });

  describe('Deduplication Check', () => {
    it('should find existing lead by email or phone', async () => {
      const mockLead = { id: 'uuid-1', email: 'test@example.com', phone: '+84901234567' } as LeadEntity;
      (leadRepo.findOne as jest.Mock).mockResolvedValue(mockLead);

      const result = await service.findDuplicate('test@example.com', '+84901234567');
      expect(result).toEqual(mockLead);
      expect(leadRepo.findOne).toHaveBeenCalled();
    });

    it('should return null if no duplicate is found', async () => {
      (leadRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findDuplicate('new@example.com', '+84999999999');
      expect(result).toBeNull();
    });
  });

  describe('extractLeadInfo and createPendingLead', () => {
    it('should extract fields from raw payload', () => {
      const payload = {
        event_id: 'evt_999',
        lead_data: { full_name: 'Test User', email: 'test@example.com', phone: '0901234567', city: 'HCM' },
        campaign: { campaign_id: 'c_1', campaign_name: 'Camp 1' },
      };

      const extracted = service.extractLeadInfo(payload);
      expect(extracted.externalId).toBe('evt_999');
      expect(extracted.name).toBe('Test User');
      expect(extracted.email).toBe('test@example.com');
      expect(extracted.phone).toBe('+84901234567');
      expect(extracted.city).toBe('HCM');
    });

    it('should create and save a pending lead if not exists', async () => {
      (leadRepo.findOne as jest.Mock).mockResolvedValue(null);
      (leadRepo.save as jest.Mock).mockImplementation((lead) => Promise.resolve({ id: 'lead-new', ...lead }));

      const payload = {
        event_id: 'evt_new',
        lead_data: { full_name: 'New Lead' },
      };

      const lead = await service.createPendingLead(payload);
      expect(lead.id).toBe('lead-new');
      expect(lead.status).toBe('pending');
      expect(leadRepo.save).toHaveBeenCalled();
    });

    it('should calculate full 100 points with Vietnamese custom questions', () => {
      const data = {
        phone: '0901234567',
        email: 'test@example.com',
        city: 'Hà Nội',
        custom_questions: [
          { question: 'Ngân sách dự kiến', answer: '10-20 triệu' },
          { question: 'Thời gian thực hiện', answer: 'Trong tuần này' },
        ],
      };

      const result = service.calculateQualityScore(data);
      expect(result.score).toBe(100);
      expect(result.classification).toBe('Hot');
    });

    it('should classify event types correctly', () => {
      expect(service.classifyEvent({ event: 'lead.generate' })).toBe('lead_submission');
      expect(service.classifyEvent({ event: 'form.complete' })).toBe('form_completion');
      expect(service.classifyEvent({ event: 'user.click_view' })).toBe('user_interaction');
    });

    it('should dispatch conversion event structure', async () => {
      const conv = await service.sendConversionEvent({
        eventName: 'Purchase',
        leadId: 'lead-1',
        dealId: 'deal-1',
        value: 10000000,
        currency: 'VND',
      });
      expect(conv.success).toBe(true);
      expect(conv.event).toBe('Purchase');
      expect(conv.data.data[0].properties.value).toBe(10000000);
    });
  });
});
