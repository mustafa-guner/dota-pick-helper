import { Controller, Get, Logger, Param, ParseIntPipe, Post } from '@nestjs/common';
import { HeroDetail, HeroesGrouped, RoleHistoryEntry } from '@dota-pick-helper/shared-types';
import { HeroesService } from './heroes.service';
import { HeroSyncService } from './hero-sync.service';
import { PatchesService } from '../patches/patches.service';
import { AiAnalysisService } from '../ai-analysis/ai-analysis.service';

@Controller('heroes')
export class HeroesController {
  private readonly logger = new Logger(HeroesController.name);

  constructor(
    private readonly heroesService: HeroesService,
    private readonly heroSyncService: HeroSyncService,
    private readonly patchesService: PatchesService,
    private readonly aiAnalysisService: AiAnalysisService,
  ) {}

  @Get()
  findAllGrouped(): Promise<HeroesGrouped> {
    return this.heroesService.findAllGrouped();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<HeroDetail> {
    const [hero, latestPatch] = await Promise.all([
      this.heroesService.findById(id),
      this.patchesService.getOrRefreshLatest(),
    ]);

    // Cache-only lookup — never calls Ollama, so the hero's kit/stats always render fast.
    // Uncached analysis is fetched separately by the client via GET /ai/analysis/:heroId,
    // since a cache miss can take minutes of CPU-bound inference.
    const roleAnalysis = await this.aiAnalysisService
      .getCachedAnalysis(id, latestPatch.version)
      .catch((error: Error) => {
        this.logger.warn(`Role analysis lookup failed for hero ${id}: ${error.message}`);
        return null;
      });

    return { ...hero, currentPatchVersion: latestPatch.version, roleAnalysis };
  }

  @Get(':id/role-history')
  roleHistory(@Param('id', ParseIntPipe) id: number): Promise<RoleHistoryEntry[]> {
    return this.aiAnalysisService.getRoleHistory(id);
  }

  @Post('sync')
  sync(): Promise<{ synced: number }> {
    return this.heroSyncService.syncAll();
  }
}
