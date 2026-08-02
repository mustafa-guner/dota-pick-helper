import type { RoleRecommendation } from '@dota-pick-helper/shared-types';
import { ROLE_LABELS } from '../lib/roleLabels';

export default function RoleBadge({ role, confidence, rank }: RoleRecommendation) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dota-border bg-dota-panel-alt px-3 py-2">
      <span className="text-xs font-bold text-gold">#{rank}</span>
      <span className="font-medium text-white">{ROLE_LABELS[role]}</span>
      <span className="ml-auto text-xs text-gray-400">{Math.round(confidence * 100)}%</span>
    </div>
  );
}
