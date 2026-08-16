import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PrimaryAttr } from '@dota-pick-helper/shared-types';
import { api } from '../api/client';
import AttributeSection from '../components/AttributeSection';

const ATTR_ORDER: PrimaryAttr[] = ['str', 'agi', 'int', 'all'];

export default function HeroListPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['heroes'],
    queryFn: api.getHeroesGrouped,
  });

  const statusQuery = useQuery({
    queryKey: ['bulkAnalysisStatus'],
    queryFn: api.getBulkAnalysisStatus,
    refetchInterval: (query) => (query.state.data?.running ? 5000 : false),
  });

  const triggerMutation = useMutation({
    mutationFn: api.triggerBulkAnalysis,
    onSuccess: (status) => {
      queryClient.setQueryData(['bulkAnalysisStatus'], status);
    },
  });

  const status = statusQuery.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gold sm:text-3xl">Dota 2 Pick Helper</h1>
        <p className="mt-1 text-sm text-gray-400">
          Every hero, grouped by attribute. Click one to see its current-patch role.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending || status?.running}
            className="rounded-md border border-dota-border px-3 py-1.5 text-xs text-gray-300 hover:border-gold/60 hover:text-gold disabled:opacity-50"
          >
            {status?.running ? 'Analyzing…' : 'Check for patch updates'}
          </button>

          {status?.running && (
            <span className="text-xs text-gray-500">
              Analyzing {status.completed}/{status.total} heroes for patch {status.patchVersion}…
            </span>
          )}

          {!status?.running && triggerMutation.isSuccess && (
            <span className="text-xs text-gray-500">
              {triggerMutation.data.total > 0
                ? `Finished analyzing ${triggerMutation.data.total} heroes for patch ${triggerMutation.data.patchVersion}.`
                : `All heroes already analyzed for patch ${triggerMutation.data.patchVersion}.`}
            </span>
          )}
        </div>
      </header>

      {isLoading && <p className="text-gray-400">Loading heroes…</p>}

      {isError && (
        <div className="rounded-md border border-str/50 bg-str/10 p-4 text-sm text-red-300">
          Failed to load heroes: {(error as Error).message}. Make sure the API is running and try{' '}
          <code className="rounded bg-black/30 px-1">POST /heroes/sync</code> once to seed hero
          data.
        </div>
      )}

      {data && ATTR_ORDER.map((attr) => <AttributeSection key={attr} attr={attr} heroes={data[attr]} />)}
    </div>
  );
}
