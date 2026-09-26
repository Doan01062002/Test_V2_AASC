import { Controller, Get, Put, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigurationEntity } from '../database/entities/configuration.entity';
import {
  DEFAULT_FIELD_MAPPING,
  DEFAULT_DEAL_RULES,
} from '../database/seeds/initial-config.seed';

import { Optional } from '@nestjs/common';
import { RedisCacheService } from '../cache/redis-cache.service';
import { UpdateFieldMappingsDto, UpdateDealRulesDto } from './dto/update-config.dto';

@ApiTags('Management')
@Controller('api/v1/config')
export class ConfigController {
  private readonly logger = new Logger(ConfigController.name);

  constructor(
    @InjectRepository(ConfigurationEntity)
    private readonly configRepository: Repository<ConfigurationEntity>,
    @Optional()
    private readonly cacheService?: RedisCacheService,
  ) {}

  @Get('mappings')
  @ApiOperation({ summary: 'Get current TikTok-to-Bitrix24 field mapping configuration' })
  @ApiResponse({ status: 200, description: 'Field mapping configuration' })
  async getFieldMappings() {
    const cacheKey = 'config:field_mapping';
    if (this.cacheService) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const config = await this.configRepository.findOne({
      where: { key: 'field_mapping' },
    });
    const result = config?.value || DEFAULT_FIELD_MAPPING;
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, result, 3600);
    }
    return result;
  }

  @Put('mappings')
  @ApiOperation({ summary: 'Update TikTok-to-Bitrix24 field mapping configuration' })
  @ApiResponse({ status: 200, description: 'Updated field mappings' })
  async updateFieldMappings(@Body() body: UpdateFieldMappingsDto | Record<string, string>) {
    const mappings = (body as UpdateFieldMappingsDto).mappings || body;
    let config = await this.configRepository.findOne({
      where: { key: 'field_mapping' },
    });
    if (!config) {
      config = this.configRepository.create({
        key: 'field_mapping',
        value: mappings,
      });
    } else {
      config.value = mappings;
    }
    await this.configRepository.save(config);

    if (this.cacheService) {
      await this.cacheService.del('config:field_mapping');
    }

    return {
      success: true,
      message: 'Field mapping updated successfully',
      mappings: config.value,
    };
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get Deal conversion rules' })
  @ApiResponse({ status: 200, description: 'Deal conversion rules list' })
  async getDealRules() {
    const cacheKey = 'config:deal_rules';
    if (this.cacheService) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const config = await this.configRepository.findOne({
      where: { key: 'deal_rules' },
    });
    const result = config?.value || DEFAULT_DEAL_RULES;
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, result, 3600);
    }
    return result;
  }

  @Put('rules')
  @ApiOperation({ summary: 'Update Deal conversion rules' })
  @ApiResponse({ status: 200, description: 'Updated deal conversion rules' })
  async updateDealRules(@Body() body: UpdateDealRulesDto | any[]) {
    const rules = Array.isArray(body) ? body : (body as UpdateDealRulesDto).rules || body;
    let config = await this.configRepository.findOne({
      where: { key: 'deal_rules' },
    });
    if (!config) {
      config = this.configRepository.create({
        key: 'deal_rules',
        value: rules,
      });
    } else {
      config.value = rules;
    }
    await this.configRepository.save(config);

    if (this.cacheService) {
      await this.cacheService.del('config:deal_rules');
    }

    return {
      success: true,
      message: 'Deal conversion rules updated successfully',
      rules: config.value,
    };
  }
}
