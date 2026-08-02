import type { HeroSummary, PrimaryAttr } from '@dota-pick-helper/shared-types';
import HeroCard from './HeroCard';

const ATTRIBUTE_META: Record<PrimaryAttr, { label: string; bar: string; text: string }> = {
  str: { label: 'Strength', bar: 'bg-str', text: 'text-str' },
  agi: { label: 'Agility', bar: 'bg-agi', text: 'text-agi' },
  int: { label: 'Intelligence', bar: 'bg-int', text: 'text-int' },
  all: { label: 'Universal', bar: 'bg-universal', text: 'text-universal' },
};

export default function AttributeSection({
  attr,
  heroes,
}: {
  attr: PrimaryAttr;
  heroes: HeroSummary[];
}) {
  const meta = ATTRIBUTE_META[attr];

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center gap-3">
        <span className={`h-5 w-1.5 rounded-full ${meta.bar}`} />
        <h2 className={`text-lg font-semibold tracking-wide ${meta.text}`}>{meta.label}</h2>
        <span className="text-sm text-gray-500">{heroes.length} heroes</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {heroes.map((hero) => (
          <HeroCard key={hero.id} hero={hero} />
        ))}
      </div>
    </section>
  );
}
