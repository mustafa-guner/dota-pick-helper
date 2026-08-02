export type {
  PrimaryAttr,
  AttackType,
  HeroAbility,
  HeroTalent,
  HeroBaseStats,
  Hero,
  HeroSummary,
  HeroesGrouped,
} from './hero';
export type { HeroDetail } from './hero-detail';
export type {
  PatchSummary,
  HeroPatchChangeNote,
  HeroAbilityPatchNote,
  HeroPatchChange,
} from './patch';
export type { RoleRecommendation, RoleAnalysis, RoleHistoryEntry } from './role-analysis';

// A const object (not a TS `enum`) — enums compile to an IIFE-wrapped assignment that
// Rollup's commonjs interop can't statically detect as a named export, which breaks bundling
// in consumers like the web app. This compiles to a plain top-level `exports.HeroRole = {...}`.
export const HeroRole = {
  SAFELANE: 'SAFELANE',
  MID: 'MID',
  OFFLANE: 'OFFLANE',
  SOFT_SUPPORT: 'SOFT_SUPPORT',
  HARD_SUPPORT: 'HARD_SUPPORT',
} as const;
export type HeroRole = (typeof HeroRole)[keyof typeof HeroRole];
