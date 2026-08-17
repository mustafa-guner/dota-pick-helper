import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminHeroSummary, AdminMetrics, RoleRecommendation } from '@dota-pick-helper/shared-types';
import { Hero } from '../heroes/entities/hero.entity';
import { HeroRoleAnalysis } from '../ai-analysis/entities/hero-role-analysis.entity';
import { PatchesService } from '../patches/patches.service';
import { BulkAnalysisService } from '../ai-analysis/bulk-analysis.service';
import { MatchStatsCollectorService } from '../match-stats/match-stats-collector.service';

interface HeroWithAnalysisRow {
  id: number;
  localizedName: string;
  imageUrl: string;
  roles: RoleRecommendation[] | null;
  summary: string | null;
  patchVersion: string | null;
  analyzedAt: Date | null;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Hero) private readonly heroRepository: Repository<Hero>,
    @InjectRepository(HeroRoleAnalysis)
    private readonly analysisRepository: Repository<HeroRoleAnalysis>,
    private readonly patchesService: PatchesService,
    private readonly bulkAnalysisService: BulkAnalysisService,
    private readonly matchStatsCollectorService: MatchStatsCollectorService,
    private readonly configService: ConfigService,
  ) {}

  async getMetrics(): Promise<AdminMetrics> {
    const patch = await this.patchesService.getOrRefreshLatest();
    const [totalHeroes, analyzedForCurrentPatch, pendingForCurrentPatch] = await Promise.all([
      this.heroRepository.count(),
      this.analysisRepository.count({ where: { patchVersion: patch.version } }),
      this.bulkAnalysisService.countPending(patch.version),
    ]);

    return {
      patchVersion: patch.version,
      patchTimestamp: patch.patchTimestamp,
      totalHeroes,
      analyzedForCurrentPatch,
      pendingForCurrentPatch,
      bulkAnalysis: this.bulkAnalysisService.getStatus(),
      ollamaModel: this.configService.get<string>('ollamaModel') ?? 'llama3.1',
      matchStatsCollectedAt: this.matchStatsCollectorService.getStatus().lastCollectedAt,
    };
  }

  async listHeroesWithAnalysis(): Promise<AdminHeroSummary[]> {
    const patch = await this.patchesService.getOrRefreshLatest();

    const rows = await this.heroRepository
      .createQueryBuilder('hero')
      .leftJoin(
        HeroRoleAnalysis,
        'analysis',
        'analysis.hero_id = hero.id AND analysis.patch_version = :patchVersion',
        { patchVersion: patch.version },
      )
      .select('hero.id', 'id')
      .addSelect('hero.localizedName', 'localizedName')
      .addSelect('hero.imageUrl', 'imageUrl')
      .addSelect('analysis.roles', 'roles')
      .addSelect('analysis.summary', 'summary')
      .addSelect('analysis.patchVersion', 'patchVersion')
      .addSelect('analysis.analyzedAt', 'analyzedAt')
      .orderBy('hero.localizedName', 'ASC')
      .getRawMany<HeroWithAnalysisRow>();

    return rows.map((row) => ({
      id: row.id,
      localizedName: row.localizedName,
      imageUrl: row.imageUrl,
      roles: row.roles ?? null,
      summary: row.summary ?? null,
      patchVersion: row.patchVersion ?? null,
      analyzedAt: row.analyzedAt ? new Date(row.analyzedAt).toISOString() : null,
    }));
  }
}
