import { Controller, ParseIntPipe, Param, Post, Get } from '@nestjs/common';
import { RoleAnalysis } from '@dota-pick-helper/shared-types';
import { AiAnalysisService } from './ai-analysis.service';
import { PatchesService } from '../patches/patches.service';

@Controller('ai')
export class AiAnalysisController {
  constructor(
    private readonly aiAnalysisService: AiAnalysisService,
    private readonly patchesService: PatchesService,
  ) {}

  // Get-or-create for the current patch. Can take minutes on a cache miss (CPU-bound Ollama
  // inference) — callers should fetch this separately from hero data, not block page render on it.
  @Get('analysis/:heroId')
  async getAnalysis(@Param('heroId', ParseIntPipe) heroId: number): Promise<RoleAnalysis> {
    const patch = await this.patchesService.getOrRefreshLatest();
    return this.aiAnalysisService.getOrCreateAnalysis(heroId, patch);
  }

  @Post('analyze/:heroId')
  forceAnalyze(@Param('heroId', ParseIntPipe) heroId: number): Promise<RoleAnalysis> {
    return this.aiAnalysisService.forceAnalyze(heroId);
  }
}
