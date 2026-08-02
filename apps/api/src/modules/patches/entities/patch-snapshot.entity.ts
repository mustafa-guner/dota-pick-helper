import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('patch_snapshots')
export class PatchSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  version: string;

  @Column({ name: 'patch_timestamp', type: 'int' })
  patchTimestamp: number;

  @Column({ name: 'raw_data', type: 'jsonb' })
  rawData: Record<string, unknown>;

  @CreateDateColumn({ name: 'fetched_at' })
  fetchedAt: Date;
}
