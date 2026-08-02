import { Hero } from './hero';
import { RoleAnalysis } from './role-analysis';

export interface HeroDetail extends Hero {
  currentPatchVersion: string;
  roleAnalysis: RoleAnalysis | null;
}
