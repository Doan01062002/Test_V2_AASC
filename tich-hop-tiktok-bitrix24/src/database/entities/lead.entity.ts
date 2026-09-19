import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { DealEntity } from './deal.entity';

@Entity('leads')
export class LeadEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_leads_external_id')
  @Column({ name: 'external_id', type: 'varchar', length: 255, unique: true })
  externalId: string;

  @Column({ type: 'varchar', length: 50, default: 'tiktok' })
  source: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index('idx_leads_email')
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Index('idx_leads_phone')
  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Index('idx_leads_campaign_id')
  @Column({ name: 'campaign_id', type: 'varchar', length: 255, nullable: true })
  campaignId: string;

  @Column({ name: 'ad_id', type: 'varchar', length: 255, nullable: true })
  adId: string;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: Record<string, any>;

  @Column({ name: 'bitrix24_id', type: 'integer', nullable: true })
  bitrix24Id: number;

  @Column({ name: 'quality_score', type: 'integer', default: 0 })
  qualityScore: number;

  @Index('idx_leads_status')
  @Column({ type: 'varchar', length: 50, default: 'new' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => DealEntity, (deal) => deal.lead)
  deals: DealEntity[];
}
