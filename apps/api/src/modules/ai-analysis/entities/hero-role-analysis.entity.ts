import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { RoleRecommendation } from '@dota-pick-helper/shared-types';
import { Hero } from '../../heroes/entities/hero.entity';
import { PatchSnapshot } from '../../patches/entities/patch-snapshot.entity';

@Entity('hero_role_analyses')
@Unique(['heroId', 'patchVersion'])
export class HeroRoleAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hero_id' })
  heroId: number;

  @ManyToOne(() => Hero, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hero_id' })
  hero: Hero;

  @Column({ name: 'patch_id' })
  patchId: string;

  @ManyToOne(() => PatchSnapshot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patch_id' })
  patch: PatchSnapshot;

  @Column({ name: 'patch_version' })
  patchVersion: string;

  @Column({ type: 'jsonb' })
  roles: RoleRecommendation[];

  @Column({ type: 'text' })
  summary: string;

  @Column({ name: 'raw_model_response', type: 'jsonb' })
  rawModelResponse: unknown;

  @Column({ name: 'analyzed_at', type: 'timestamptz' })
  analyzedAt: Date;
}
