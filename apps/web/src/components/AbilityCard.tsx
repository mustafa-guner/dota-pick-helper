import type { HeroAbility } from '@dota-pick-helper/shared-types';

export default function AbilityCard({ ability }: { ability: HeroAbility }) {
  return (
    <div className="rounded-md border border-dota-border bg-dota-panel-alt p-3">
      <h3 className="font-semibold text-white">{ability.localizedName}</h3>
      {ability.behavior && (
        <p className="mt-0.5 text-xs uppercase tracking-wide text-gray-500">{ability.behavior}</p>
      )}
      {ability.description && <p className="mt-1.5 text-sm text-gray-300">{ability.description}</p>}
    </div>
  );
}
