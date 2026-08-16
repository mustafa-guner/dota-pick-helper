import { useQuery } from '@tanstack/react-query';
import type { PrimaryAttr } from '@dota-pick-helper/shared-types';
import { api } from '../api/client';
import AttributeSection from '../components/AttributeSection';

const ATTR_ORDER: PrimaryAttr[] = ['str', 'agi', 'int', 'all'];

export default function HeroListPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['heroes'],
    queryFn: api.getHeroesGrouped,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gold sm:text-3xl">Dota 2 Pick Helper</h1>
        <p className="mt-1 text-sm text-gray-400">
          Every hero, grouped by attribute. Click one to see its current-patch role.
        </p>
      </header>

      {isLoading && <p className="text-gray-400">Loading heroes…</p>}

      {isError && (
        <div className="rounded-md border border-str/50 bg-str/10 p-4 text-sm text-red-300">
          Failed to load heroes: {(error as Error).message}.
        </div>
      )}

      {data && ATTR_ORDER.map((attr) => <AttributeSection key={attr} attr={attr} heroes={data[attr]} />)}
    </div>
  );
}
