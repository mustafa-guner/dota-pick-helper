import { Injectable } from '@nestjs/common';
import { RoleRecommendation } from '@dota-pick-helper/shared-types';
import { MatchStatsService } from '../match-stats/match-stats.service';

const MIN_TOTAL_GAMES = 5;
const MIN_ROLE_GAMES = 2;
const CONFIDENCE_FULL_SAMPLE_GAMES = 15;
const MAX_ROLES = 3;

/**
 * Deterministically turns HeroLaneStats (real pro-match win/pick data) into ranked role
 * recommendations — the LLM never decides roles, only explains them (see ai-analysis.service.ts).
 * Below MIN_TOTAL_GAMES of pro presence this patch, returns [] rather than guessing.
 */
@Injectable()
export class RoleScoringService {
  constructor(private readonly matchStatsService: MatchStatsService) {}

  async computeRoles(heroId: number, patchVersion: string): Promise<RoleRecommendation[]> {
    const laneStats = await this.matchStatsService.getLaneStats(heroId, patchVersion);

    const totalGames = laneStats.reduce((sum, row) => sum + row.games, 0);
    if (totalGames < MIN_TOTAL_GAMES) return [];

    return laneStats
      .filter((row) => row.games >= MIN_ROLE_GAMES)
      .map((row) => {
        const winRate = row.wins / row.games;
        // Shrinks toward neutral 0.5 as sample size drops below CONFIDENCE_FULL_SAMPLE_GAMES,
        // so a 1-1 record doesn't look as confident as a 15-8 one.
        const sampleWeight = Math.min(1, row.games / CONFIDENCE_FULL_SAMPLE_GAMES);
        const confidence = 0.5 + (winRate - 0.5) * sampleWeight;
        return { role: row.role, confidence };
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_ROLES)
      .map((entry, index) => ({
        role: entry.role,
        confidence: Math.round(entry.confidence * 100) / 100,
        rank: index + 1,
      }));
  }
}
