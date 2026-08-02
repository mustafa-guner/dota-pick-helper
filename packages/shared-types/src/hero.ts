export type PrimaryAttr = 'str' | 'agi' | 'int' | 'all';

export type AttackType = 'Melee' | 'Ranged';

export interface HeroAbility {
  id: number;
  name: string;
  localizedName: string;
  description: string;
  behavior?: string;
  damageType?: string;
}

export interface HeroTalent {
  level: number;
  slot: 'left' | 'right';
  description: string;
}

export interface HeroBaseStats {
  baseHealth: number;
  baseMana: number;
  baseArmor: number;
  baseDamageMin: number;
  baseDamageMax: number;
  moveSpeed: number;
  baseStr: number;
  baseAgi: number;
  baseInt: number;
  strGain: number;
  agiGain: number;
  intGain: number;
}

export interface Hero {
  id: number;
  internalName: string;
  localizedName: string;
  primaryAttr: PrimaryAttr;
  attackType: AttackType;
  imageUrl: string;
  iconUrl: string;
  communityRoles: string[];
  abilities: HeroAbility[];
  talents: HeroTalent[];
  baseStats: HeroBaseStats;
}

export interface HeroSummary {
  id: number;
  localizedName: string;
  primaryAttr: PrimaryAttr;
  imageUrl: string;
  iconUrl: string;
}

export interface HeroesGrouped {
  str: HeroSummary[];
  agi: HeroSummary[];
  int: HeroSummary[];
  all: HeroSummary[];
}
