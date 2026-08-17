import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BulkAnalysisStatus } from '@dota-pick-helper/shared-types';
import { Hero } from '../heroes/entities/hero.entity';
import { PatchSnapshot } from '../patches/entities/patch-snapshot.entity';
import { PatchesService } from '../patches/patches.service';
import { MatchStatsCollectorService } from '../match-stats/match-stats-collector.service';
import { AiAnalysisService } from './ai-analysis.service';
import { HeroRoleAnalysis } from './entities/hero-role-analysis.entity';

@Injectable()
export class BulkAnalysisService {
  private readonly logger = new Logger(BulkAnalysisService.name);

  private status: BulkAnalysisStatus = {
    running: false,
    phase: 'idle',
    total: 0,
    completed: 0,
    patchVersion: null,
  };

  constructor(
    @InjectRepository(Hero) private readonly heroRepository: Repository<Hero>,
    private readonly patchesService: PatchesService,
    private readonly matchStatsCollectorService: MatchStatsCollectorService,
    private readonly aiAnalysisService: AiAnalysisService,
  ) {}

  getStatus(): BulkAnalysisStatus {
    return { ...this.status };
  }

  async countPending(patchVersion: string): Promise<number> {
    const pendingIds = await this.findPendingHeroIds(patchVersion);
    return pendingIds.length;
  }

  /**
   * Finds heroes without a cached analysis for the current patch and, if any exist, kicks off
   * analyzing them one at a time in the background (each Ollama call is CPU-bound and can take
   * minutes, so these must never run concurrently on a small VPS). Returns immediately either
   * way — callers poll getStatus() for progress.
   */
  async checkAndQueue(): Promise<BulkAnalysisStatus> {
    if (this.status.running) return this.getStatus();

    const patch = await this.patchesService.getOrRefreshLatest();
    const pendingIds = await this.findPendingHeroIds(patch.version);

    if (pendingIds.length === 0) {
      this.status = {
        running: false,
        phase: 'idle',
        total: 0,
        completed: 0,
        patchVersion: patch.version,
      };
      return this.getStatus();
    }

    this.status = {
      running: true,
      phase: 'collecting-stats',
      total: 0,
      completed: 0,
      patchVersion: patch.version,
    };
    void this.runSequentially(pendingIds, patch);
    return this.getStatus();
  }

  private async findPendingHeroIds(patchVersion: string): Promise<number[]> {
    const rows = await this.heroRepository
      .createQueryBuilder('hero')
      .select('hero.id', 'id')
      .leftJoin(
        HeroRoleAnalysis,
        'analysis',
        'analysis.hero_id = hero.id AND analysis.patch_version = :patchVersion',
        { patchVersion },
      )
      .where('analysis.id IS NULL')
      .getRawMany<{ id: number }>();
    return rows.map((row) => row.id);
  }

  private async runSequentially(heroIds: number[], patch: PatchSnapshot): Promise<void> {
    try {
      await this.matchStatsCollectorService.collectForPatch(patch, (completed, total) => {
        this.status = { ...this.status, phase: 'collecting-stats', completed, total };
      });
    } catch (error) {
      this.logger.warn(`Match stats collection failed, continuing with stale stats: ${(error as Error).message}`);
    }

    this.status = {
      ...this.status,
      phase: 'analyzing-heroes',
      total: heroIds.length,
      completed: 0,
    };

    for (const heroId of heroIds) {
      try {
        await this.aiAnalysisService.getOrCreateAnalysis(heroId, patch);
      } catch (error) {
        this.logger.warn(`Bulk analysis failed for hero ${heroId}: ${(error as Error).message}`);
      }
      this.status.completed += 1;
    }

    this.logger.log(
      `Bulk analysis finished for patch ${patch.version}: ${this.status.completed}/${this.status.total} heroes`,
    );
    this.status = { ...this.status, running: false, phase: 'idle' };
  }
}
