export interface BulkAnalysisStatus {
  running: boolean;
  total: number;
  completed: number;
  patchVersion: string | null;
}
