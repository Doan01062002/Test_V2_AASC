import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('mapping_configs')
export class MappingConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  configKey: string;

  @Column({ type: 'text' })
  configJson: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
