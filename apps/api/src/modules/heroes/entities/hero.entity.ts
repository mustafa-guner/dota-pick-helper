import { Column, Entity, PrimaryColumn } from 'typeorm';
import {
  AttackType,
  HeroAbility,
  HeroBaseStats,
  HeroTalent,
  PrimaryAttr,
} from '@dota-pick-helper/shared-types';

@Entity('heroes')
export class Hero {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ name: 'internal_name' })
  internalName: string;

  @Column({ name: 'localized_name' })
  localizedName: string;

  @Column({ name: 'primary_attr', type: 'varchar' })
  primaryAttr: PrimaryAttr;

  @Column({ name: 'attack_type', type: 'varchar' })
  attackType: AttackType;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({ name: 'icon_url' })
  iconUrl: string;

  @Column({ name: 'community_roles', type: 'jsonb', default: () => "'[]'" })
  communityRoles: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  abilities: HeroAbility[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  talents: HeroTalent[];

  @Column({ name: 'base_stats', type: 'jsonb' })
  baseStats: HeroBaseStats;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;
}
