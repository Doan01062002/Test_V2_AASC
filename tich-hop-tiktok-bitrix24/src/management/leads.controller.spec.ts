import { Test, TestingModule } from '@nestjs/testing';
import { LeadsController } from './leads.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeadEntity } from '../database/entities/lead.entity';
import { DealEntity } from '../database/entities/deal.entity';
import { Bitrix24Service } from '../bitrix24/bitrix24.service';
import { NotFoundException } from '@nestjs/common';

describe('LeadsController', () => {
  let controller: LeadsController;
  let leadRepo: any;
  let dealRepo: any;
  let bitrix24Service: Bitrix24Service;

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([
        [{ id: 'lead-1', name: 'Nguyen Van A', source: 'tiktok' }],
        1,
      ]),
    };

    leadRepo = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    dealRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'deal-1', ...e })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [
        {
          provide: getRepositoryToken(LeadEntity),
          useValue: leadRepo,
        },
        {
          provide: getRepositoryToken(DealEntity),
          useValue: dealRepo,
        },
        {
          provide: Bitrix24Service,
          useValue: {
            createDeal: jest.fn().mockResolvedValue(555),
            sendNotification: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<LeadsController>(LeadsController);
    bitrix24Service = module.get<Bitrix24Service>(Bitrix24Service);
  });

  describe('getLeads', () => {
    it('should return paginated leads list', async () => {
      const result = await controller.getLeads(1, 10, 'tiktok');
      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe('convertToDeal', () => {
    it('should convert an existing lead to a deal', async () => {
      const mockLead = {
        id: 'lead-1',
        name: 'Nguyen Van A',
        bitrix24Id: 101,
        status: 'new',
      };
      leadRepo.findOne.mockResolvedValue(mockLead);

      const deal = await controller.convertToDeal('lead-1', {
        title: 'VIP Deal',
        amount: 10000000,
      });

      expect(deal).toBeDefined();
      expect(deal.title).toBe('VIP Deal');
      expect(bitrix24Service.createDeal).toHaveBeenCalled();
      expect(mockLead.status).toBe('converted');
    });

    it('should throw NotFoundException if lead does not exist', async () => {
      leadRepo.findOne.mockResolvedValue(null);
      await expect(controller.convertToDeal('non-existing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
