import { Test, TestingModule } from '@nestjs/testing';
import { ConfigController } from './config.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigurationEntity } from '../database/entities/configuration.entity';

describe('ConfigController', () => {
  let controller: ConfigController;
  let configRepo: any;

  beforeEach(async () => {
    configRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigController],
      providers: [
        {
          provide: getRepositoryToken(ConfigurationEntity),
          useValue: configRepo,
        },
      ],
    }).compile();

    controller = module.get<ConfigController>(ConfigController);
  });

  it('should get field mappings', async () => {
    configRepo.findOne.mockResolvedValue({
      key: 'field_mapping',
      value: { 'lead_data.name': 'NAME' },
    });

    const res = await controller.getFieldMappings();
    expect(res).toEqual({ 'lead_data.name': 'NAME' });
  });

  it('should update field mappings', async () => {
    configRepo.findOne.mockResolvedValue(null);

    const res = await controller.updateFieldMappings({
      'lead_data.city': 'UF_CRM_CITY',
    });
    expect(res.success).toBe(true);
    expect(configRepo.save).toHaveBeenCalled();
  });

  it('should get deal rules', async () => {
    configRepo.findOne.mockResolvedValue({
      key: 'deal_rules',
      value: [{ id: 'rule1' }],
    });

    const res = await controller.getDealRules();
    expect(res).toEqual([{ id: 'rule1' }]);
  });

  it('should update deal rules', async () => {
    configRepo.findOne.mockResolvedValue({ key: 'deal_rules', value: [] });

    const res = await controller.updateDealRules([{ id: 'rule2' }]);
    expect(res.success).toBe(true);
    expect(configRepo.save).toHaveBeenCalled();
  });
});
