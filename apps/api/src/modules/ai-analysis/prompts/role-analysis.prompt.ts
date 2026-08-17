import { HeroPatchChange, RoleRecommendation } from '@dota-pick-helper/shared-types';
import { Hero } from '../../heroes/entities/hero.entity';
import { PatchSnapshot } from '../../patches/entities/patch-snapshot.entity';
import { HeroLaneStats } from '../../match-stats/entities/hero-lane-stats.entity';

export interface SummaryPromptInput {
  hero: Hero;
  patch: PatchSnapshot;
  heroChange: HeroPatchChange | null;
  roles: RoleRecommendation[];
  laneStats: HeroLaneStats[];
  previous: { patchVersion: string; roles: RoleRecommendation[]; summary: string } | null;
}

const ROLE_LABELS: Record<string, string> = {
  SAFELANE: 'Safelane',
  MID: 'Mid',
  OFFLANE: 'Offlane',
  SOFT_SUPPORT: 'Soft Support',
  HARD_SUPPORT: 'Hard Support',
};

const SYSTEM_PROMPT = `You are a veteran Dota 2 competitive analyst. You are given a hero's kit, \
this patch's balance changes, and real professional-match win/pick rate data. The role ranking \
has ALREADY been decided from that real data — your only job is to write a 2-4 sentence \
explanation of why those roles make sense, grounded in the specific win rates and patch notes \
given to you. Do not propose different roles, do not contradict the given ranking, and do not \
invent balance changes that were not listed. Reference concrete numbers (win rate, sample size) \
and specific patch notes when relevant.`;

function formatAbilities(hero: Hero): string {
  return hero.abilities.map((a) => `- ${a.localizedName}: ${a.description}`).join('\n');
}

function formatHeroChange(heroChange: HeroPatchChange | null): string {
  if (!heroChange || (!heroChange.heroNotes.length && !heroChange.abilityNotes.length)) {
    return 'No explicit balance changes were listed for this hero in this patch.';
  }

  const lines: string[] = [];
  for (const note of heroChange.heroNotes) {
    lines.push(`- ${note.note}`);
  }
  for (const ability of heroChange.abilityNotes) {
    for (const note of ability.notes) {
      lines.push(`- (ability id ${ability.abilityId}) ${note.note}`);
    }
  }
  return lines.join('\n');
}

function formatRoles(roles: RoleRecommendation[], laneStats: HeroLaneStats[]): string {
  return [...roles]
    .sort((a, b) => a.rank - b.rank)
    .map((r) => {
      const stats = laneStats.find((s) => s.role === r.role);
      const label = ROLE_LABELS[r.role] ?? r.role;
      if (!stats) return `${r.rank}. ${label} (confidence ${r.confidence})`;
      const winRate = Math.round((stats.wins / stats.games) * 100);
      return `${r.rank}. ${label} — ${winRate}% win rate over ${stats.games} professional games this patch (confidence ${r.confidence})`;
    })
    .join('\n');
}

function formatPrevious(previous: SummaryPromptInput['previous']): string {
  if (!previous) return 'No prior analysis on record for this hero.';
  const roles = previous.roles
    .sort((a, b) => a.rank - b.rank)
    .map((r) => ROLE_LABELS[r.role] ?? r.role)
    .join(', ');
  return `On patch ${previous.patchVersion}, this hero was assessed as: ${roles}. Reasoning was: "${previous.summary}"`;
}

export function buildSummaryPrompt(input: SummaryPromptInput): { system: string; user: string } {
  const { hero, patch, heroChange, roles, laneStats, previous } = input;

  const user = `HERO: ${hero.localizedName} (${hero.primaryAttr === 'all' ? 'Universal' : hero.primaryAttr}, ${hero.attackType})

ABILITIES:
${formatAbilities(hero)}

CURRENT PATCH: ${patch.version}

THIS HERO'S CHANGES IN PATCH ${patch.version}:
${formatHeroChange(heroChange)}

ALREADY-DECIDED ROLE RANKING (from real professional-match data — explain this, do not change it):
${formatRoles(roles, laneStats)}

PREVIOUS PATCH ANALYSIS (for continuity — call out if the role has shifted and why):
${formatPrevious(previous)}

Write a 2-4 sentence explanation of why ${hero.localizedName} fits the role(s) above on patch ${patch.version}.`;

  return { system: SYSTEM_PROMPT, user };
}
