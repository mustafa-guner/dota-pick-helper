import type { RoleHistoryEntry } from '@dota-pick-helper/shared-types';
import { ROLE_LABELS } from '../lib/roleLabels';
import PatchTag from './PatchTag';

export default function RoleHistoryTimeline({ entries }: { entries: RoleHistoryEntry[] }) {
  if (!entries.length) {
    return <p className="text-sm text-gray-500">No prior analyses recorded yet.</p>;
  }

  return (
    <ol className="space-y-4 border-l border-dota-border pl-4">
      {entries.map((entry) => {
        const topRoles = [...entry.roles]
          .sort((a, b) => a.rank - b.rank)
          .map((r) => ROLE_LABELS[r.role])
          .join(' / ');

        return (
          <li key={entry.patchVersion} className="relative">
            <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-gold" />
            <div className="flex flex-wrap items-center gap-2">
              <PatchTag version={entry.patchVersion} />
              <span className="text-sm font-medium text-white">{topRoles}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">{entry.summary}</p>
          </li>
        );
      })}
    </ol>
  );
}
