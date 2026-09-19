import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LeadEntity } from './lead.entity';

@Entity('deals')
export class DealEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_deals_lead_id')
  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId: string;

  @ManyToOne(() => LeadEntity, (lead) => lead.deals, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'lead_id' })
  lead: LeadEntity;

  @Index('idx_deals_bitrix24_id')
  @Column({ name: 'bitrix24_id', type: 'integer', nullable: true })
  bitrix24Id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => parseFloat(value as string) || 0,
    },
  })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'VND' })
  currency: string;

  @Index('idx_deals_stage')
  @Column({ type: 'varchar', length: 50, default: 'NEW' })
  stage: string;

  @Column({ type: 'integer', default: 0 })
  probability: number;

  @Column({ name: 'assigned_to', type: 'varchar', length: 50, nullable: true })
  assignedTo: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
