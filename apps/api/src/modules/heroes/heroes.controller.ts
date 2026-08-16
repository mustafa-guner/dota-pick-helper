import { Controller, Get, Logger, Param, ParseIntPipe } from '@nestjs/common';
import { HeroDetail, HeroesGrouped, RoleHistoryEntry } from '@dota-pick-helper/shared-types';
import { HeroesService } from './heroes.service';
import { PatchesService } from '../patches/patches.service';
import { AiAnalysisService } from '../ai-analysis/ai-analysis.service';

@Controller('heroes')
export class HeroesController {
  private readonly logger = new Logger(HeroesController.name);

  constructor(
    private readonly heroesService: HeroesService,
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

    // Cache-only lookup — never calls Ollama. Public requests never trigger inference; only the
    // scheduler and the admin panel do (see modules/admin).
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
}
