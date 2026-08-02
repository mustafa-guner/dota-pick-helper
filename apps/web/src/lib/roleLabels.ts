import { HeroRole } from '@dota-pick-helper/shared-types';

export const ROLE_LABELS: Record<HeroRole, string> = {
  [HeroRole.SAFELANE]: 'Safelane',
  [HeroRole.MID]: 'Mid',
  [HeroRole.OFFLANE]: 'Offlane',
  [HeroRole.SOFT_SUPPORT]: 'Soft Support',
  [HeroRole.HARD_SUPPORT]: 'Hard Support',
};
