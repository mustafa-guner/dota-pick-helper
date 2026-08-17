import type {
  AdminHeroSummary,
  AdminMetrics,
  BulkAnalysisStatus,
  HeroDetail,
  HeroesGrouped,
  RoleAnalysis,
  RoleHistoryEntry,
} from '@dota-pick-helper/shared-types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
const ADMIN_TOKEN_KEY = 'dota_admin_token';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(`Request to ${path} failed (${res.status}): ${body}`, res.status);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getHeroesGrouped: () => request<HeroesGrouped>('/heroes'),
  getHeroDetail: (id: number) => request<HeroDetail>(`/heroes/${id}`),
  getRoleHistory: (id: number) => request<RoleHistoryEntry[]>(`/heroes/${id}/role-history`),
};

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  return request<T>(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: token ? `Bearer ${token}` : '' },
  });
}

export const adminApi = {
  login: (username: string, password: string) =>
    request<{ token: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getMetrics: () => adminRequest<AdminMetrics>('/admin/metrics'),
  listHeroes: () => adminRequest<AdminHeroSummary[]>('/admin/heroes'),
  syncHeroes: () => adminRequest<{ synced: number }>('/admin/heroes/sync', { method: 'POST' }),
  analyzeHero: (id: number) =>
    adminRequest<RoleAnalysis>(`/admin/heroes/${id}/analyze`, { method: 'POST' }),
  triggerBulkAnalysis: () =>
    adminRequest<BulkAnalysisStatus>('/admin/analyze-all', { method: 'POST' }),
  triggerFullReanalysis: () =>
    adminRequest<BulkAnalysisStatus>('/admin/reanalyze-all', { method: 'POST' }),
  getBulkAnalysisStatus: () => adminRequest<BulkAnalysisStatus>('/admin/analyze-all/status'),
};
