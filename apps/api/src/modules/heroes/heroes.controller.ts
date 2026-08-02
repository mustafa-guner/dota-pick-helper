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

    // AI analysis is a best-effort enhancement — if Ollama is unavailable (not running,
    // model not pulled, etc.), the hero's kit/stats should still render rather than 500ing the page.
    const roleAnalysis = await this.aiAnalysisService
      .getOrCreateAnalysis(id, latestPatch)
      .catch((error: Error) => {
        this.logger.warn(`Role analysis unavailable for hero ${id}: ${error.message}`);
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
