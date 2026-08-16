import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import RoleBadge from '../components/RoleBadge';
import PatchTag from '../components/PatchTag';
import AbilityCard from '../components/AbilityCard';
import RoleHistoryTimeline from '../components/RoleHistoryTimeline';

const ATTR_LABELS: Record<string, string> = {
  str: 'Strength',
  agi: 'Agility',
  int: 'Intelligence',
  all: 'Universal',
};

export default function HeroDetailPage() {
  const { id } = useParams<{ id: string }>();
  const heroId = Number(id);

  const heroQuery = useQuery({
    queryKey: ['hero', heroId],
    queryFn: () => api.getHeroDetail(heroId),
    enabled: Number.isFinite(heroId),
  });

  const historyQuery = useQuery({
    queryKey: ['roleHistory', heroId],
    queryFn: () => api.getRoleHistory(heroId),
    enabled: Number.isFinite(heroId),
  });

  if (heroQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-gray-400">Loading hero…</div>
    );
  }

  if (heroQuery.isError || !heroQuery.data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Link to="/" className="text-sm text-gold hover:underline">
          ← Back to heroes
        </Link>
        <p className="mt-4 text-red-300">
          Failed to load hero: {(heroQuery.error as Error)?.message}
        </p>
      </div>
    );
  }

  const hero = heroQuery.data;
  const sortedRoles = hero.roleAnalysis
    ? [...hero.roleAnalysis.roles].sort((a, b) => a.rank - b.rank)
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <Link to="/" className="text-sm text-gold hover:underline">
        ← Back to heroes
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-[360px_1fr]">
        {/* Left: image + identity */}
        <div>
          <img
            src={hero.imageUrl}
            alt={hero.localizedName}
            className="w-full rounded-lg border border-dota-border object-cover"
          />
          <h1 className="mt-4 text-3xl font-bold text-white">{hero.localizedName}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <span className="rounded-md border border-dota-border bg-dota-panel-alt px-2 py-1">
              {ATTR_LABELS[hero.primaryAttr]}
            </span>
            <span className="rounded-md border border-dota-border bg-dota-panel-alt px-2 py-1">
              {hero.attackType}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-gray-300">
            <dt className="text-gray-500">Health</dt>
            <dd>{hero.baseStats.baseHealth}</dd>
            <dt className="text-gray-500">Mana</dt>
            <dd>{hero.baseStats.baseMana}</dd>
            <dt className="text-gray-500">Armor</dt>
            <dd>{hero.baseStats.baseArmor}</dd>
            <dt className="text-gray-500">Damage</dt>
            <dd>
              {hero.baseStats.baseDamageMin}-{hero.baseStats.baseDamageMax}
            </dd>
            <dt className="text-gray-500">Move Speed</dt>
            <dd>{hero.baseStats.moveSpeed}</dd>
            <dt className="text-gray-500">STR / AGI / INT</dt>
            <dd>
              {hero.baseStats.baseStr} / {hero.baseStats.baseAgi} / {hero.baseStats.baseInt}
            </dd>
          </dl>
        </div>

        {/* Right: roles, abilities, talents, history */}
        <div>
          <section className="rounded-lg border border-dota-border bg-dota-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">Recommended Roles</h2>
                <PatchTag version={hero.currentPatchVersion} />
              </div>
            </div>

            {hero.roleAnalysis ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sortedRoles.map((r) => (
                    <RoleBadge key={r.role} {...r} />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-300">
                  {hero.roleAnalysis.summary}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-gray-500">Role analysis unavailable.</p>
            )}
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-white">Abilities</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {hero.abilities.map((ability) => (
                <AbilityCard key={ability.id} ability={ability} />
              ))}
            </div>
          </section>

          {hero.talents.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-white">Talents</h2>
              <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                {[10, 15, 20, 25].map((level) => (
                  <div key={level} className="contents">
                    {hero.talents
                      .filter((t) => t.level === level)
                      .sort((a, b) => (a.slot === b.slot ? 0 : a.slot === 'left' ? -1 : 1))
                      .map((t, i) => (
                        <div
                          key={`${level}-${i}`}
                          className="rounded-md border border-dota-border bg-dota-panel-alt px-3 py-2 text-sm text-gray-300"
                        >
                          <span className="mr-2 text-xs text-gray-500">Lv{level}</span>
                          {t.description}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-white">Role History</h2>
            <RoleHistoryTimeline entries={historyQuery.data ?? []} />
          </section>
        </div>
      </div>
    </div>
  );
}
