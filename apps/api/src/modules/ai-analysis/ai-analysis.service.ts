import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleAnalysis, RoleHistoryEntry } from '@dota-pick-helper/shared-types';
import { Hero } from '../heroes/entities/hero.entity';
import { PatchSnapshot } from '../patches/entities/patch-snapshot.entity';
import { PatchesService } from '../patches/patches.service';
import { MatchStatsService } from '../match-stats/match-stats.service';
import { OllamaClientService } from './ollama-client.service';
import { RoleScoringService } from './role-scoring.service';
import { HeroRoleAnalysis } from './entities/hero-role-analysis.entity';
import { buildSummaryPrompt } from './prompts/role-analysis.prompt';

const NO_DATA_SUMMARY = 'No professional match data is available yet for this hero this patch.';

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);

  constructor(
    @InjectRepository(Hero) private readonly heroRepository: Repository<Hero>,
    @InjectRepository(HeroRoleAnalysis)
    private readonly analysisRepository: Repository<HeroRoleAnalysis>,
    private readonly patchesService: PatchesService,
    private readonly matchStatsService: MatchStatsService,
    private readonly roleScoringService: RoleScoringService,
    private readonly ollamaClient: OllamaClientService,
  ) {}

  /**
   * Returns the cached analysis for (hero, patch), computing and caching it if absent. Heroes
   * with no patch notes in this patch almost never change role — those carry forward the most
   * recent prior analysis instead of paying for a fresh (CPU-bound, slow) Ollama call.
   */
  async getOrCreateAnalysis(heroId: number, patch: PatchSnapshot): Promise<RoleAnalysis> {
    const existing = await this.analysisRepository.findOneBy({
      heroId,
      patchVersion: patch.version,
    });
    if (existing) return this.toDto(existing);

    const heroChange = await this.patchesService.getHeroChange(heroId, patch);
    if (!heroChange) {
      const carried = await this.carryForwardIfUnchanged(heroId, patch);
      if (carried) return carried;
    }

    return this.runAnalysis(heroId, patch);
  }

  /** Cache-only lookup — never calls Ollama. Used where callers can't afford to block on inference. */
  async getCachedAnalysis(heroId: number, patchVersion: string): Promise<RoleAnalysis | null> {
    const existing = await this.analysisRepository.findOneBy({ heroId, patchVersion });
    return existing ? this.toDto(existing) : null;
  }

  async forceAnalyze(heroId: number): Promise<RoleAnalysis> {
    const patch = await this.patchesService.getOrRefreshLatest();
    return this.runAnalysis(heroId, patch);
  }

  async getRoleHistory(heroId: number): Promise<RoleHistoryEntry[]> {
    const rows = await this.analysisRepository.find({
      where: { heroId },
      relations: ['patch'],
      order: { analyzedAt: 'DESC' },
    });

    return rows.map((row) => ({
      patchVersion: row.patchVersion,
      patchTimestamp: row.patch.patchTimestamp,
      roles: row.roles,
      summary: row.summary,
      analyzedAt: row.analyzedAt.toISOString(),
    }));
  }

  /**
   * Roles are decided by RoleScoringService from real pro-match data (see role-scoring.service.ts)
   * — Ollama is only ever asked to explain that ranking in prose, never to invent it. With no
   * pro-match sample this patch, roles come back empty and Ollama isn't called at all.
   */
  private async runAnalysis(heroId: number, patch: PatchSnapshot): Promise<RoleAnalysis> {
    const hero = await this.heroRepository.findOneBy({ id: heroId });
    if (!hero) {
      throw new NotFoundException(`Hero ${heroId} not found — try POST /heroes/sync first`);
    }

    const roles = await this.roleScoringService.computeRoles(heroId, patch.version);

    let summary: string;
    if (roles.length === 0) {
      summary = NO_DATA_SUMMARY;
    } else {
      const [heroChange, previous, laneStats] = await Promise.all([
        this.patchesService.getHeroChange(heroId, patch),
        this.findPreviousAnalysis(heroId, patch),
        this.matchStatsService.getLaneStats(heroId, patch.version),
      ]);

      const { system, user } = buildSummaryPrompt({
        hero,
        patch,
        heroChange,
        roles,
        laneStats,
        previous,
      });
      summary = await this.ollamaClient.getSummary(system, user);
    }

    const existing = await this.analysisRepository.findOneBy({
      heroId,
      patchVersion: patch.version,
    });
    const entity =
      existing ??
      this.analysisRepository.create({ heroId, patchId: patch.id, patchVersion: patch.version });

    entity.roles = roles;
    entity.summary = summary;
    entity.rawModelResponse = { roles, summary };
    entity.analyzedAt = new Date();

    const saved = await this.analysisRepository.save(entity);
    return this.toDto(saved);
  }

  private async carryForwardIfUnchanged(
    heroId: number,
    patch: PatchSnapshot,
  ): Promise<RoleAnalysis | null> {
    const previous = await this.analysisRepository.findOne({
      where: { heroId },
      order: { analyzedAt: 'DESC' },
    });
    if (!previous) return null;

    const carried = this.analysisRepository.create({
      heroId,
      patchId: patch.id,
      patchVersion: patch.version,
      roles: previous.roles,
      summary: previous.summary,
      rawModelResponse: previous.rawModelResponse,
      analyzedAt: new Date(),
    });
    const saved = await this.analysisRepository.save(carried);
    this.logger.log(`Carried forward analysis for hero ${heroId} (no changes in patch ${patch.version})`);
    return this.toDto(saved);
  }

  private async findPreviousAnalysis(
    heroId: number,
    patch: PatchSnapshot,
  ): Promise<{ patchVersion: string; roles: RoleAnalysis['roles']; summary: string } | null> {
    const rows = await this.analysisRepository.find({
      where: { heroId },
      relations: ['patch'],
      order: { analyzedAt: 'DESC' },
      take: 5,
    });
    const previous = rows.find((row) => row.patch.patchTimestamp < patch.patchTimestamp);
    if (!previous) return null;
    return { patchVersion: previous.patchVersion, roles: previous.roles, summary: previous.summary };
  }

  private toDto(entity: HeroRoleAnalysis): RoleAnalysis {
    return {
      heroId: entity.heroId,
      patchVersion: entity.patchVersion,
      roles: entity.roles,
      summary: entity.summary,
      analyzedAt: entity.analyzedAt.toISOString(),
    };
  }
}
