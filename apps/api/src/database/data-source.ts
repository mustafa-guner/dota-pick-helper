import { DataSourceOptions } from 'typeorm';
import { Hero } from '../modules/heroes/entities/hero.entity';
import { PatchSnapshot } from '../modules/patches/entities/patch-snapshot.entity';
import { HeroPatchChange } from '../modules/patches/entities/hero-patch-change.entity';
import { HeroRoleAnalysis } from '../modules/ai-analysis/entities/hero-role-analysis.entity';
import { HeroLaneStats } from '../modules/match-stats/entities/hero-lane-stats.entity';

export const buildTypeOrmOptions = (databaseUrl: string): DataSourceOptions => ({
  type: 'postgres',
  url: databaseUrl,
  entities: [Hero, PatchSnapshot, HeroPatchChange, HeroRoleAnalysis, HeroLaneStats],
  // Personal-scale project: schema sync on boot instead of migrations for now.
  synchronize: true,
  logging: false,
});
