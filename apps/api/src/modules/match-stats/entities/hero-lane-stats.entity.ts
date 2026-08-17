import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { HeroRole } from '@dota-pick-helper/shared-types';

@Entity('hero_lane_stats')
@Unique(['heroId', 'patchVersion', 'role'])
export class HeroLaneStats {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hero_id' })
  heroId: number;

  @Column({ name: 'patch_id' })
  patchId: string;

  @Column({ name: 'patch_version' })
  patchVersion: string;

  @Column({ type: 'varchar' })
  role: HeroRole;

  @Column({ type: 'int' })
  games: number;

  @Column({ type: 'int' })
  wins: number;

  @Column({ name: 'avg_gpm', type: 'float' })
  avgGpm: number;

  @Column({ name: 'window_start', type: 'int' })
  windowStart: number;

  @Column({ name: 'window_end', type: 'int' })
  windowEnd: number;

  @Column({ name: 'collected_at', type: 'timestamptz' })
  collectedAt: Date;
}
