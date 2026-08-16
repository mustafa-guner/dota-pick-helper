import type {
  BulkAnalysisStatus,
  HeroDetail,
  HeroesGrouped,
  RoleAnalysis,
  RoleHistoryEntry,
} from '@dota-pick-helper/shared-types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Request to ${path} failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getHeroesGrouped: () => request<HeroesGrouped>('/heroes'),
  getHeroDetail: (id: number) => request<HeroDetail>(`/heroes/${id}`),
  getRoleHistory: (id: number) => request<RoleHistoryEntry[]>(`/heroes/${id}/role-history`),
  getRoleAnalysis: (id: number) => request<RoleAnalysis>(`/ai/analysis/${id}`),
  forceAnalyze: (id: number) =>
    request<RoleAnalysis>(`/ai/analyze/${id}`, { method: 'POST' }),
  triggerBulkAnalysis: () =>
    request<BulkAnalysisStatus>('/ai/analyze-all', { method: 'POST' }),
  getBulkAnalysisStatus: () => request<BulkAnalysisStatus>('/ai/analyze-all/status'),
};
