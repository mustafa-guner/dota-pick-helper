import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { HeroAbilityPatchNote, HeroPatchChangeNote } from '@dota-pick-helper/shared-types';
import { PatchSnapshot } from './patch-snapshot.entity';

@Entity('hero_patch_changes')
@Unique(['heroId', 'patchId'])
export class HeroPatchChange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Intentionally no FK/relation to Hero: patch ingestion (from dota2.com) and hero sync
  // (from OpenDota) are independent data sources that can happen in either order.
  @Index()
  @Column({ name: 'hero_id' })
  heroId: number;

  @Column({ name: 'patch_id' })
  patchId: string;

  @ManyToOne(() => PatchSnapshot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patch_id' })
  patch: PatchSnapshot;

  @Column({ name: 'hero_notes', type: 'jsonb', default: () => "'[]'" })
  heroNotes: HeroPatchChangeNote[];

  @Column({ name: 'ability_notes', type: 'jsonb', default: () => "'[]'" })
  abilityNotes: HeroAbilityPatchNote[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
