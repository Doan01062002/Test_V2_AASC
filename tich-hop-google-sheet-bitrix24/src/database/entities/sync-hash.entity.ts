import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('sync_hashes')
export class SyncHash {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 128, unique: true })
  rowIdentifier: string;

  @Column({ type: 'integer', nullable: true })
  leadId: number;

  @Column({ type: 'varchar', length: 64 })
  contentHash: string;

  @Column({ type: 'varchar', length: 32, default: 'sheet_to_crm' })
  direction: string;

  @Column({ type: 'varchar', length: 32, default: 'SYNCED' })
  status: string;

  @UpdateDateColumn()
  lastSyncedAt: Date;
}
