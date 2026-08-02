import { HeroPatchChange, RoleRecommendation } from '@dota-pick-helper/shared-types';
import { Hero } from '../../heroes/entities/hero.entity';
import { PatchSnapshot } from '../../patches/entities/patch-snapshot.entity';

export interface RoleAnalysisPromptInput {
  hero: Hero;
  patch: PatchSnapshot;
  heroChange: HeroPatchChange | null;
  previous: { patchVersion: string; roles: RoleRecommendation[]; summary: string } | null;
}

const SYSTEM_PROMPT = `You are a veteran Dota 2 competitive analyst who tracks every patch closely. \
You help a returning player who has not kept up with recent balance changes figure out which lane \
role(s) a hero currently fits, based on the hero's kit and the specific balance changes in the \
current patch. Be concrete and decisive. Ground your reasoning in the actual patch notes given to \
you and the hero's ability kit — do not invent changes that were not listed. If no changes were \
listed for this hero this patch, say so explicitly and reason from the hero's kit and its role in \
the broader current meta instead.`;

function formatAbilities(hero: Hero): string {
  return hero.abilities
    .map((a) => `- ${a.localizedName}: ${a.description}`)
    .join('\n');
}

function formatTalents(hero: Hero): string {
  return hero.talents
    .map((t) => `- Level ${t.level} (${t.slot}): ${t.description}`)
    .join('\n');
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

function formatPrevious(previous: RoleAnalysisPromptInput['previous']): string {
  if (!previous) return 'No prior analysis on record for this hero.';
  const roles = previous.roles
    .sort((a, b) => a.rank - b.rank)
    .map((r) => r.role)
    .join(', ');
  return `On patch ${previous.patchVersion}, this hero was assessed as: ${roles}. Reasoning was: "${previous.summary}"`;
}

export function buildRoleAnalysisPrompt(input: RoleAnalysisPromptInput): {
  system: string;
  user: string;
} {
  const { hero, patch, heroChange, previous } = input;

  const user = `HERO: ${hero.localizedName} (${hero.primaryAttr === 'all' ? 'Universal' : hero.primaryAttr}, ${hero.attackType})

BASE STATS: ${hero.baseStats.baseStr} STR / ${hero.baseStats.baseAgi} AGI / ${hero.baseStats.baseInt} INT (gain ${hero.baseStats.strGain}/${hero.baseStats.agiGain}/${hero.baseStats.intGain} per level), ${hero.baseStats.baseHealth} HP, ${hero.baseStats.baseMana} mana, move speed ${hero.baseStats.moveSpeed}, base damage ${hero.baseStats.baseDamageMin}-${hero.baseStats.baseDamageMax}

ABILITIES:
${formatAbilities(hero)}

TALENTS:
${formatTalents(hero)}

CURRENT PATCH: ${patch.version}

THIS HERO'S CHANGES IN PATCH ${patch.version}:
${formatHeroChange(heroChange)}

PREVIOUS PATCH ANALYSIS (for continuity — call out if the role has shifted and why):
${formatPrevious(previous)}

Based on all of the above, determine the realistic current lane role(s) for ${hero.localizedName} on patch ${patch.version} and submit your analysis via the submit_role_analysis tool.`;

  return { system: SYSTEM_PROMPT, user };
}
