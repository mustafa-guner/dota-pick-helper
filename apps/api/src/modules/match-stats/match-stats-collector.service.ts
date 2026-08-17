import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeroRole } from '@dota-pick-helper/shared-types';
import { Hero } from '../heroes/entities/hero.entity';
import { PatchSnapshot } from '../patches/entities/patch-snapshot.entity';
import { HeroLaneStats } from './entities/hero-lane-stats.entity';
import { OpenDotaExplorerService } from './opendota-explorer.service';

// Verified live: over 21 days, a moderately-picked hero (Abaddon) had only 1 parsed pro game vs.
// 59 over 90 days — 21 was too narrow to reliably clear RoleScoringService's 5-game floor for
// anything but heavily-contested heroes. 45 trades some "current patch only" freshness for
// enough sample size to actually produce a role call for most of the hero pool.
const MIN_LOOKBACK_DAYS = 45;
const DELAY_BETWEEN_HEROES_MS = 300;

// Team-wide GPM rank (1 = highest farm on the team, 5 = lowest) mapped straight to the
// conventional position 1-5 farm-priority ordering. Replaces an earlier approach that paired
// players sharing OpenDota's lane_role=1 tag and compared GPM within the pair — verified live
// that this was unreliable (Crystal Maiden was the *only* player tagged lane_role=1 on her team
// in 10/10 recent pro games, no partner to compare against, so it always fell out as SAFELANE
// core). Ranking across the full team by GPM has no such gap and, as a bonus, distinguishes
// SOFT_SUPPORT from HARD_SUPPORT, which the old approach could never produce.
const RANK_TO_ROLE: Record<number, HeroRole> = {
  1: HeroRole.SAFELANE,
  2: HeroRole.MID,
  3: HeroRole.OFFLANE,
  4: HeroRole.SOFT_SUPPORT,
  5: HeroRole.HARD_SUPPORT,
};

interface TeamRankRow {
  team_gpm_rank: number;
  games: string; // Explorer returns bigint counts as strings
  wins: string;
  avg_gpm: string;
}

interface CollectorStatus {
  lastCollectedAt: string | null;
  patchVersion: string | null;
}

/**
 * Pulls pro-match win/pick rates per hero+position from OpenDota Explorer and stores them as
 * HeroLaneStats — the evidence RoleScoringService turns into role recommendations. Loops per
 * hero rather than one global query: verified live that Explorer times out (~15s) on a
 * team-wide-rank query left unscoped by hero, but scoping to the specific match_ids a hero
 * appeared in first (see queryHeroStats) keeps it to ~1-1.5s per hero.
 */
@Injectable()
export class MatchStatsCollectorService {
  private readonly logger = new Logger(MatchStatsCollectorService.name);
  private status: CollectorStatus = { lastCollectedAt: null, patchVersion: null };

  constructor(
    @InjectRepository(Hero) private readonly heroRepository: Repository<Hero>,
    @InjectRepository(HeroLaneStats)
    private readonly laneStatsRepository: Repository<HeroLaneStats>,
    private readonly explorer: OpenDotaExplorerService,
  ) {}

  getStatus(): CollectorStatus {
    return { ...this.status };
  }

  async collectForPatch(
    patch: PatchSnapshot,
    onProgress?: (completed: number, total: number) => void,
  ): Promise<void> {
    const heroes = await this.heroRepository.find({ select: ['id'] });

    for (let i = 0; i < heroes.length; i++) {
      await this.collectForOneHero(heroes[i].id, patch);
      onProgress?.(i + 1, heroes.length);
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_HEROES_MS));
    }

    this.status = { lastCollectedAt: new Date().toISOString(), patchVersion: patch.version };
    this.logger.log(`Match stats collection finished for patch ${patch.version}`);
  }

  /**
   * Collects fresh stats for a single hero right now (~1-1.5s). Used before an on-demand
   * single-hero analysis so it never depends on the bulk job having run first — without this, a
   * hero with no HeroLaneStats row yet would score 0 pro games and skip straight to "no data
   * available" looking instant/broken, even though real data might exist and just hasn't been
   * pulled yet.
   */
  async collectForHeroNow(heroId: number, patch: PatchSnapshot): Promise<void> {
    await this.collectForOneHero(heroId, patch);
  }

  private async collectForOneHero(heroId: number, patch: PatchSnapshot): Promise<void> {
    const windowEnd = Math.floor(Date.now() / 1000);
    // Always look back at least MIN_LOOKBACK_DAYS so a brand-new patch still has some sample,
    // even if it's partly pre-patch pro data — a documented v1 approximation.
    const since = Math.min(patch.patchTimestamp, windowEnd - MIN_LOOKBACK_DAYS * 86400);

    try {
      const rows = await this.queryHeroStats(heroId, since);
      await this.saveRows(heroId, patch, rows, since, windowEnd);
    } catch (error) {
      this.logger.warn(
        `Match stats collection failed for hero ${heroId}: ${(error as Error).message}`,
      );
    }
  }

  private async queryHeroStats(heroId: number, since: number): Promise<TeamRankRow[]> {
    // Two-step: first find the (small, hero-scoped, indexed) set of match_ids this hero appeared
    // in, then rank ALL players within just those matches by GPM per team. Ranking must see the
    // whole roster, not just this hero's row, so hero_id can't be filtered before the window
    // function runs — but ranking with no match_id bound at all times out (~15s), hence the
    // two-step scoping. Verified live at ~1-1.5s this way.
    const sql = `
      WITH target AS (
        SELECT DISTINCT pm.match_id
        FROM player_matches pm
        JOIN matches m ON pm.match_id = m.match_id
        WHERE m.leagueid IS NOT NULL
          AND m.start_time >= ${since}
          AND pm.hero_id = ${heroId}
      ),
      ranked AS (
        SELECT
          pm.match_id,
          pm.hero_id,
          pm.gold_per_min,
          ((pm.player_slot < 128) = m.radiant_win) AS won,
          RANK() OVER (
            PARTITION BY pm.match_id, (pm.player_slot < 128)
            ORDER BY pm.gold_per_min DESC
          ) AS team_gpm_rank
        FROM player_matches pm
        JOIN matches m ON pm.match_id = m.match_id
        WHERE pm.match_id IN (SELECT match_id FROM target)
      )
      SELECT team_gpm_rank, COUNT(*) AS games,
             SUM(CASE WHEN won THEN 1 ELSE 0 END) AS wins,
             AVG(gold_per_min) AS avg_gpm
      FROM ranked
      WHERE hero_id = ${heroId}
      GROUP BY team_gpm_rank
    `;
    return this.explorer.runQuery<TeamRankRow>(sql);
  }

  private async saveRows(
    heroId: number,
    patch: PatchSnapshot,
    rows: TeamRankRow[],
    windowStart: number,
    windowEnd: number,
  ): Promise<void> {
    for (const row of rows) {
      const role = RANK_TO_ROLE[row.team_gpm_rank];
      if (!role) continue; // ranks beyond 5 shouldn't occur in a 5-player team, but be defensive

      const games = parseInt(row.games, 10);
      const wins = parseInt(row.wins, 10);
      const avgGpm = parseFloat(row.avg_gpm);

      const existing = await this.laneStatsRepository.findOneBy({
        heroId,
        patchVersion: patch.version,
        role,
      });
      const entity =
        existing ??
        this.laneStatsRepository.create({
          heroId,
          patchId: patch.id,
          patchVersion: patch.version,
          role,
        });

      entity.games = games;
      entity.wins = wins;
      entity.avgGpm = avgGpm;
      entity.windowStart = windowStart;
      entity.windowEnd = windowEnd;
      entity.collectedAt = new Date();

      await this.laneStatsRepository.save(entity);
    }
  }
}
