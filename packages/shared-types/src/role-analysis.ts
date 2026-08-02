// HeroRole is declared in ./index (not re-exported from here) because TypeScript compiles
// `export { X } from './submodule'` to a getter-based re-export that Rollup's commonjs
// interop cannot statically resolve for consumers bundling this package (e.g. the web app).
import type { HeroRole } from './index';

export interface RoleRecommendation {
  role: HeroRole;
  confidence: number;
  rank: number;
}

export interface RoleAnalysis {
  heroId: number;
  patchVersion: string;
  roles: RoleRecommendation[];
  summary: string;
  analyzedAt: string;
}

export interface RoleHistoryEntry {
  patchVersion: string;
  patchTimestamp: number;
  roles: RoleRecommendation[];
  summary: string;
  analyzedAt: string;
}
