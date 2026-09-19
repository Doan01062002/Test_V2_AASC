import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum SyncTriggerType {
  CRON = 'cron',
  MANUAL = 'manual',
  CLI = 'cli',
  WEBHOOK = 'webhook',
}

export enum SyncJobStatus {
  SUCCESS = 'SUCCESS',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  FAILED = 'FAILED',
}

@Entity('sync_logs')
export class SyncLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  jobId: string;

  @Column({ type: 'varchar', length: 32, default: SyncTriggerType.MANUAL })
  triggerType: SyncTriggerType;

  @Column({ type: 'varchar', length: 32, default: SyncJobStatus.SUCCESS })
  status: SyncJobStatus;

  @Column({ type: 'integer', default: 0 })
  totalRows: number;

  @Column({ type: 'integer', default: 0 })
  createdCount: number;

  @Column({ type: 'integer', default: 0 })
  updatedCount: number;

  @Column({ type: 'integer', default: 0 })
  skippedCount: number;

  @Column({ type: 'integer', default: 0 })
  errorCount: number;

  @Column({ type: 'text', nullable: true })
  errorDetails: string;

  @Column({ type: 'integer', default: 0 })
  durationMs: number;

  @CreateDateColumn()
  createdAt: Date;
}
