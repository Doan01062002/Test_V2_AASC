import { Test, TestingModule } from '@nestjs/testing';
import { DealsController } from './deals.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DealEntity } from '../database/entities/deal.entity';

describe('DealsController', () => {
  let controller: DealsController;
  let dealRepo: any;

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([
        [{ id: 'deal-1', title: 'Deal 1', stage: 'NEW' }],
        1,
      ]),
    };

    dealRepo = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DealsController],
      providers: [
        {
          provide: getRepositoryToken(DealEntity),
          useValue: dealRepo,
        },
      ],
    }).compile();

    controller = module.get<DealsController>(DealsController);
  });

  it('should return deals with open filter', async () => {
    const res = await controller.getDeals(1, 10, 'open', 'user-1');
    expect(res.data.length).toBe(1);
    expect(res.total).toBe(1);
    expect(dealRepo.createQueryBuilder).toHaveBeenCalled();
  });

  it('should return deals with specific stage filter', async () => {
    const res = await controller.getDeals(1, 10, 'WON', undefined);
    expect(res.data.length).toBe(1);
  });
});
