export type BulkAnalysisPhase = 'idle' | 'collecting-stats' | 'analyzing-heroes';

export interface BulkAnalysisStatus {
  running: boolean;
  phase: BulkAnalysisPhase;
  total: number;
  completed: number;
  patchVersion: string | null;
}
