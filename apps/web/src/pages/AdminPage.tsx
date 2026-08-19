import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, adminApi, clearAdminToken, getAdminToken, setAdminToken } from '../api/client';
import { ROLE_LABELS } from '../lib/roleLabels';

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

const PHASE_LABELS: Record<string, string> = {
  idle: 'Idle',
  'collecting-stats': 'Collecting match stats',
  'analyzing-heroes': 'Analyzing heroes',
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => !!getAdminToken());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      adminApi.login(username, password),
    onSuccess: (data) => {
      setAdminToken(data.token);
      setAuthed(true);
      setLoginError(null);
      setUsername('');
      setPassword('');
    },
    onError: (error) => {
      setLoginError(
        error instanceof ApiError && error.status === 401
          ? 'Wrong username or password.'
          : 'Login failed — is the API reachable?',
      );
    },
  });

  const metricsQuery = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: adminApi.getMetrics,
    enabled: authed,
    refetchInterval: (query) =>
      query.state.data?.bulkAnalysis.running || query.state.data?.analyzingHeroIds.length
        ? 5000
        : 15000,
  });

  const heroesQuery = useQuery({
    queryKey: ['admin', 'heroes'],
    queryFn: adminApi.listHeroes,
    enabled: authed,
    // Keeps the table in sync with analyses finishing server-side, including ones started
    // before a page refresh (whose local mutation onSuccess never fires here).
    refetchInterval: () =>
      metricsQuery.data?.bulkAnalysis.running || metricsQuery.data?.analyzingHeroIds.length
        ? 5000
        : false,
  });

  // Bounce back to the login form if the stored token was rejected (expired/invalid).
  useEffect(() => {
    const error = metricsQuery.error ?? heroesQuery.error;
    if (error instanceof ApiError && error.status === 401) {
      clearAdminToken();
      setAuthed(false);
    }
  }, [metricsQuery.error, heroesQuery.error]);

  const syncMutation = useMutation({
    mutationFn: adminApi.syncHeroes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: adminApi.triggerBulkAnalysis,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
    },
  });

  const reanalyzeAllMutation = useMutation({
    mutationFn: adminApi.triggerFullReanalysis,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
    },
  });

  const channelsQuery = useQuery({
    queryKey: ['admin', 'youtubeChannels'],
    queryFn: adminApi.listYoutubeChannels,
    enabled: authed,
  });

  const [channelInput, setChannelInput] = useState('');
  const [channelError, setChannelError] = useState<string | null>(null);

  const addChannelMutation = useMutation({
    mutationFn: (input: string) => adminApi.addYoutubeChannel(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'youtubeChannels'] });
      setChannelInput('');
      setChannelError(null);
    },
    onError: (error) => {
      setChannelError(error instanceof Error ? error.message : 'Could not add that channel.');
    },
  });

  const removeChannelMutation = useMutation({
    mutationFn: (id: string) => adminApi.removeYoutubeChannel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'youtubeChannels'] });
    },
  });

  const [collectResult, setCollectResult] = useState<string | null>(null);

  const collectNowMutation = useMutation({
    mutationFn: adminApi.collectYoutubeNow,
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      setCollectResult(
        status.heroesCovered > 0
          ? `Matched ${status.heroesCovered} heroes from today's channel.`
          : 'Ran, but no hero names matched in that channel\'s recent uploads.',
      );
    },
    onError: (error) => {
      setCollectResult(
        error instanceof Error ? `Failed: ${error.message}` : 'Collection failed — check the quota.',
      );
    },
  });

  const [notice, setNotice] = useState<string | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: (heroId: number) => adminApi.analyzeHero(heroId),
    onSuccess: (data, heroId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'heroes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      const heroName = heroesQuery.data?.find((h) => h.id === heroId)?.localizedName ?? 'This hero';
      setNotice(
        data.roles.length === 0
          ? `${heroName}: stats were refreshed, but there are still fewer than 5 professional games recorded for it this patch — too little data for a role call yet.`
          : null,
      );
    },
  });

  if (!authed) {
    const handleSubmit = (e: FormEvent) => {
      e.preventDefault();
      loginMutation.mutate({ username, password });
    };

    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-xl font-bold text-gold">Admin Login</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoFocus
            autoComplete="username"
            className="w-full rounded-md border border-dota-border bg-dota-panel-alt px-3 py-2 text-sm text-white outline-none focus:border-gold/60"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-md border border-dota-border bg-dota-panel-alt px-3 py-2 text-sm text-white outline-none focus:border-gold/60"
          />
          <button
            type="submit"
            disabled={loginMutation.isPending || !username || !password}
            className="w-full rounded-md border border-dota-border px-3 py-2 text-sm text-gray-300 hover:border-gold/60 hover:text-gold disabled:opacity-50"
          >
            {loginMutation.isPending ? 'Logging in…' : 'Log in'}
          </button>
          {loginError && <p className="text-sm text-red-300">{loginError}</p>}
        </form>
      </div>
    );
  }

  const metrics = metricsQuery.data;
  const bulk = metrics?.bulkAnalysis;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gold">Admin Dashboard</h1>
        <button
          onClick={() => {
            clearAdminToken();
            setAuthed(false);
          }}
          className="text-xs text-gray-400 hover:text-gold"
        >
          Log out
        </button>
      </header>

      {metrics && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['Patch', metrics.patchVersion],
            ['Model', metrics.ollamaModel],
            ['Total heroes', metrics.totalHeroes],
            ['Analyzed', metrics.analyzedForCurrentPatch],
            ['Pending', metrics.pendingForCurrentPatch],
            ['Bulk status', bulk ? PHASE_LABELS[bulk.phase] : 'Idle'],
            [
              'Stats collected',
              metrics.matchStatsCollectedAt
                ? new Date(metrics.matchStatsCollectedAt).toLocaleString()
                : 'Never',
            ],
            [
              'Videos collected',
              metrics.youtubeCollectedAt
                ? `${new Date(metrics.youtubeCollectedAt).toLocaleString()} (${metrics.youtubeHeroesCovered} heroes)`
                : 'Never',
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-dota-border bg-dota-panel p-3 text-center"
            >
              <div className="text-xs text-gray-500">{label}</div>
              <div className="mt-1 text-sm font-semibold text-white">{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-3">
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="rounded-md border border-dota-border px-3 py-1.5 text-xs text-gray-300 hover:border-gold/60 hover:text-gold disabled:opacity-50"
        >
          {syncMutation.isPending ? 'Syncing…' : 'Sync heroes from OpenDota'}
        </button>
        <button
          onClick={() => bulkMutation.mutate()}
          disabled={bulkMutation.isPending || bulk?.running || analyzeMutation.isPending}
          className="rounded-md border border-dota-border px-3 py-1.5 text-xs text-gray-300 hover:border-gold/60 hover:text-gold disabled:opacity-50"
        >
          {bulk?.running ? 'Working…' : 'Analyze pending heroes'}
        </button>
        <button
          onClick={() => {
            if (
              window.confirm(
                'Re-analyze EVERY hero from scratch, ignoring existing analyses? With the current model this can take many hours of continuous Ollama inference. Proceed?',
              )
            ) {
              reanalyzeAllMutation.mutate();
            }
          }}
          disabled={reanalyzeAllMutation.isPending || bulk?.running || analyzeMutation.isPending}
          className="rounded-md border border-dota-border px-3 py-1.5 text-xs text-gray-300 hover:border-gold/60 hover:text-gold disabled:opacity-50"
        >
          {bulk?.running ? 'Working…' : 'Re-analyze ALL heroes'}
        </button>
      </div>

      {bulk?.running && (
        <div className="mb-8">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
            <span>{PHASE_LABELS[bulk.phase]}…</span>
            <span>
              {bulk.total > 0 ? `${bulk.completed}/${bulk.total}` : 'Starting…'}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-dota-panel-alt">
            <div
              className="h-full rounded-full bg-gold transition-all duration-500"
              style={{
                width: bulk.total > 0 ? `${Math.round((bulk.completed / bulk.total) * 100)}%` : '4%',
              }}
            />
          </div>
        </div>
      )}

      {notice && (
        <div className="mb-6 flex items-start justify-between gap-3 rounded-md border border-dota-border bg-dota-panel-alt px-3 py-2 text-xs text-gray-300">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="shrink-0 text-gray-500 hover:text-gold">
            Dismiss
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-dota-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-dota-panel-alt text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Hero</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Patch</th>
              <th className="px-3 py-2">Analyzed</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {heroesQuery.data?.map((hero) => {
              // Combines local mutation state (instant feedback on click) with server-confirmed
              // state (metrics.analyzingHeroIds) so the indicator survives a page refresh —
              // local-only state is lost on reload even though the analysis keeps running.
              const isThisRowAnalyzing =
                (analyzeMutation.isPending && analyzeMutation.variables === hero.id) ||
                Boolean(metrics?.analyzingHeroIds.includes(hero.id));
              return (
                <tr key={hero.id} className="border-t border-dota-border">
                  <td className="flex items-center gap-2 px-3 py-2">
                    <img src={hero.imageUrl} alt="" className="h-8 w-14 rounded object-cover" />
                    {hero.localizedName}
                  </td>
                  <td className="px-3 py-2 text-gray-300">
                    {hero.roles
                      ? [...hero.roles]
                          .sort((a, b) => a.rank - b.rank)
                          .map((r) => ROLE_LABELS[r.role])
                          .join(', ')
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{hero.patchVersion ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{formatDate(hero.analyzedAt)}</td>
                  <td className="px-3 py-2 text-right">
                    {isThisRowAnalyzing ? (
                      <div className="ml-auto w-32">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-dota-panel-alt">
                          <div className="h-full w-1/3 animate-pulse rounded-full bg-gold" />
                        </div>
                        <div className="mt-1 text-[10px] text-gray-500">Analyzing…</div>
                      </div>
                    ) : (
                      <button
                        onClick={() => analyzeMutation.mutate(hero.id)}
                        disabled={analyzeMutation.isPending || bulk?.running}
                        className="rounded-md border border-dota-border px-2.5 py-1 text-xs text-gray-300 hover:border-gold/60 hover:text-gold disabled:opacity-50"
                      >
                        Re-analyze
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="mt-10">
        <h2 className="mb-2 text-lg font-semibold text-white">YouTube Channels</h2>
        <p className="mb-4 text-xs text-gray-500">
          One channel is searched per day, rotating through the list below — this Google Cloud
          project's real quota is 100 units/day and a single search costs 100, so only one
          channel can be checked per day regardless of how many are configured.
        </p>

        <div className="mb-4 overflow-x-auto rounded-lg border border-dota-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-dota-panel-alt text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Channel ID</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {channelsQuery.data?.map((channel) => (
                <tr key={channel.id} className="border-t border-dota-border">
                  <td className="px-3 py-2 text-white">{channel.label}</td>
                  <td className="px-3 py-2 text-gray-500">{channel.channelId}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => removeChannelMutation.mutate(channel.id)}
                      disabled={removeChannelMutation.isPending}
                      className="rounded-md border border-dota-border px-2.5 py-1 text-xs text-gray-300 hover:border-str/60 hover:text-str disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {channelsQuery.data?.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
                    No channels configured — video collection will skip until one is added.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (channelInput.trim()) addChannelMutation.mutate(channelInput.trim());
          }}
          className="mb-2 flex flex-wrap gap-2"
        >
          <input
            type="text"
            value={channelInput}
            onChange={(e) => setChannelInput(e.target.value)}
            placeholder="Channel URL or @handle (e.g. youtube.com/@SomeChannel)"
            className="min-w-[20rem] flex-1 rounded-md border border-dota-border bg-dota-panel-alt px-3 py-1.5 text-sm text-white outline-none focus:border-gold/60"
          />
          <button
            type="submit"
            disabled={addChannelMutation.isPending || !channelInput.trim()}
            className="rounded-md border border-dota-border px-3 py-1.5 text-xs text-gray-300 hover:border-gold/60 hover:text-gold disabled:opacity-50"
          >
            {addChannelMutation.isPending ? 'Adding…' : 'Add channel'}
          </button>
        </form>
        {channelError && <p className="mb-4 text-xs text-red-300">{channelError}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Run video collection right now? This uses today's entire YouTube API quota (100/100 units) — the daily automatic run will effectively be skipped today. Continue?",
                )
              ) {
                setCollectResult(null);
                collectNowMutation.mutate();
              }
            }}
            disabled={collectNowMutation.isPending}
            className="rounded-md border border-dota-border px-3 py-1.5 text-xs text-gray-300 hover:border-gold/60 hover:text-gold disabled:opacity-50"
          >
            {collectNowMutation.isPending ? 'Collecting…' : 'Collect videos now'}
          </button>
          {collectResult && <span className="text-xs text-gray-400">{collectResult}</span>}
        </div>
      </section>
    </div>
  );
}
