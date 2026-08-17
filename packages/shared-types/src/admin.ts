import type { BulkAnalysisStatus } from './bulk-analysis';
import type { RoleRecommendation } from './role-analysis';

export interface AdminMetrics {
  patchVersion: string;
  patchTimestamp: number;
  totalHeroes: number;
  analyzedForCurrentPatch: number;
  pendingForCurrentPatch: number;
  bulkAnalysis: BulkAnalysisStatus;
  ollamaModel: string;
  matchStatsCollectedAt: string | null;
  analyzingHeroIds: number[];
  youtubeCollectedAt: string | null;
  youtubeHeroesCovered: number;
}

export interface AdminHeroSummary {
  id: number;
  localizedName: string;
  imageUrl: string;
  roles: RoleRecommendation[] | null;
  summary: string | null;
  patchVersion: string | null;
  analyzedAt: string | null;
}
