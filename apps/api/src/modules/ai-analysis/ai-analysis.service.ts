import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleAnalysis, RoleHistoryEntry } from '@dota-pick-helper/shared-types';
import { Hero } from '../heroes/entities/hero.entity';
import { PatchSnapshot } from '../patches/entities/patch-snapshot.entity';
import { PatchesService } from '../patches/patches.service';
import { ClaudeClientService } from './claude-client.service';
import { HeroRoleAnalysis } from './entities/hero-role-analysis.entity';
import { buildRoleAnalysisPrompt } from './prompts/role-analysis.prompt';

@Injectable()
export class AiAnalysisService {
  constructor(
    @InjectRepository(Hero) private readonly heroRepository: Repository<Hero>,
    @InjectRepository(HeroRoleAnalysis)
    private readonly analysisRepository: Repository<HeroRoleAnalysis>,
    private readonly patchesService: PatchesService,
    private readonly claudeClient: ClaudeClientService,
  ) {}

  /** Returns the cached analysis for (hero, patch), computing and caching it if absent. */
  async getOrCreateAnalysis(heroId: number, patch: PatchSnapshot): Promise<RoleAnalysis> {
    const existing = await this.analysisRepository.findOneBy({
      heroId,
      patchVersion: patch.version,
    });
    if (existing) return this.toDto(existing);
    return this.runAnalysis(heroId, patch);
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

  private async runAnalysis(heroId: number, patch: PatchSnapshot): Promise<RoleAnalysis> {
    const hero = await this.heroRepository.findOneBy({ id: heroId });
    if (!hero) {
      throw new NotFoundException(`Hero ${heroId} not found — try POST /heroes/sync first`);
    }

    const [heroChange, previous] = await Promise.all([
      this.patchesService.getHeroChange(heroId, patch),
      this.findPreviousAnalysis(heroId, patch),
    ]);

    const { system, user } = buildRoleAnalysisPrompt({ hero, patch, heroChange, previous });
    const modelOutput = await this.claudeClient.getRoleRecommendation(system, user);

    const existing = await this.analysisRepository.findOneBy({
      heroId,
      patchVersion: patch.version,
    });
    const entity =
      existing ??
      this.analysisRepository.create({ heroId, patchId: patch.id, patchVersion: patch.version });

    entity.roles = modelOutput.roles;
    entity.summary = modelOutput.summary;
    entity.rawModelResponse = modelOutput;
    entity.analyzedAt = new Date();

    const saved = await this.analysisRepository.save(entity);
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
