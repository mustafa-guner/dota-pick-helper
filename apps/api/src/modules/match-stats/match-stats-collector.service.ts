import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeroRole } from '@dota-pick-helper/shared-types';
import { Hero } from '../heroes/entities/hero.entity';
import { PatchSnapshot } from '../patches/entities/patch-snapshot.entity';
import { HeroLaneStats } from './entities/hero-lane-stats.entity';
import { OpenDotaExplorerService } from './opendota-explorer.service';

const MIN_LOOKBACK_DAYS = 21;
const DELAY_BETWEEN_HEROES_MS = 300;

interface LaneStatsRow {
  lane_role: number;
  gpm_rank: number;
  games: string; // Explorer returns bigint counts as strings
  wins: string;
  avg_gpm: string;
}

interface CollectorStatus {
  lastCollectedAt: string | null;
  patchVersion: string | null;
}

/**
 * Pulls pro-match win/pick rates per hero+lane from OpenDota Explorer and stores them as
 * HeroLaneStats — the evidence RoleScoringService turns into role recommendations. Loops per
 * hero rather than one global query: verified live that Explorer times out (~15s) on broad
 * unfiltered aggregates but a hero-scoped query (including the GPM-rank window function used to
 * split safelane core from hard support) runs in ~1s.
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

  async collectForPatch(patch: PatchSnapshot): Promise<void> {
    const heroes = await this.heroRepository.find({ select: ['id'] });
    const windowEnd = Math.floor(Date.now() / 1000);
    // Always look back at least MIN_LOOKBACK_DAYS so a brand-new patch still has some sample,
    // even if it's partly pre-patch pro data — a documented v1 approximation.
    const since = Math.min(patch.patchTimestamp, windowEnd - MIN_LOOKBACK_DAYS * 86400);

    for (const hero of heroes) {
      try {
        const rows = await this.collectForHero(hero.id, since);
        await this.saveRows(hero.id, patch, rows, since, windowEnd);
      } catch (error) {
        this.logger.warn(
          `Match stats collection failed for hero ${hero.id}: ${(error as Error).message}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_HEROES_MS));
    }

    this.status = { lastCollectedAt: new Date().toISOString(), patchVersion: patch.version };
    this.logger.log(`Match stats collection finished for patch ${patch.version}`);
  }

  private async collectForHero(heroId: number, since: number): Promise<LaneStatsRow[]> {
    const sql = `
      WITH ranked AS (
        SELECT
          pm.lane_role,
          pm.gold_per_min,
          ((pm.player_slot < 128) = m.radiant_win) AS won,
          RANK() OVER (
            PARTITION BY pm.match_id, pm.lane_role, (pm.player_slot < 128)
            ORDER BY pm.gold_per_min DESC
          ) AS gpm_rank
        FROM player_matches pm
        JOIN matches m ON pm.match_id = m.match_id
        WHERE m.leagueid IS NOT NULL
          AND m.start_time >= ${since}
          AND pm.hero_id = ${heroId}
          AND pm.lane_role IS NOT NULL
      )
      SELECT lane_role, gpm_rank, COUNT(*) AS games,
             SUM(CASE WHEN won THEN 1 ELSE 0 END) AS wins,
             AVG(gold_per_min) AS avg_gpm
      FROM ranked
      GROUP BY lane_role, gpm_rank
    `;
    return this.explorer.runQuery<LaneStatsRow>(sql);
  }

  /** OpenDota's raw lane_role doesn't distinguish position 1 from position 5 — the GPM rank
   * within the safelane pairing does (higher GPM = core, lower = hard support). Offlane trios
   * are too variable to split the same way, so SOFT_SUPPORT is never derived here (v1 gap,
   * documented in the plan). */
  private mapRole(laneRole: number, gpmRank: number): HeroRole | null {
    if (laneRole === 2) return HeroRole.MID;
    if (laneRole === 3) return HeroRole.OFFLANE;
    if (laneRole === 1) return gpmRank === 1 ? HeroRole.SAFELANE : HeroRole.HARD_SUPPORT;
    return null;
  }

  private async saveRows(
    heroId: number,
    patch: PatchSnapshot,
    rows: LaneStatsRow[],
    windowStart: number,
    windowEnd: number,
  ): Promise<void> {
    const byRole = new Map<HeroRole, { games: number; wins: number; gpmSum: number }>();

    for (const row of rows) {
      const role = this.mapRole(row.lane_role, row.gpm_rank);
      if (!role) continue;

      const games = parseInt(row.games, 10);
      const wins = parseInt(row.wins, 10);
      const avgGpm = parseFloat(row.avg_gpm);

      const existing = byRole.get(role);
      if (existing) {
        existing.gpmSum += avgGpm * games;
        existing.games += games;
        existing.wins += wins;
      } else {
        byRole.set(role, { games, wins, gpmSum: avgGpm * games });
      }
    }

    for (const [role, agg] of byRole) {
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

      entity.games = agg.games;
      entity.wins = agg.wins;
      entity.avgGpm = agg.games > 0 ? agg.gpmSum / agg.games : 0;
      entity.windowStart = windowStart;
      entity.windowEnd = windowEnd;
      entity.collectedAt = new Date();

      await this.laneStatsRepository.save(entity);
    }
  }
}
