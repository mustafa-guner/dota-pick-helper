import { Controller, ParseIntPipe, Param, Post } from '@nestjs/common';
import { RoleAnalysis } from '@dota-pick-helper/shared-types';
import { AiAnalysisService } from './ai-analysis.service';

@Controller('ai')
export class AiAnalysisController {
  constructor(private readonly aiAnalysisService: AiAnalysisService) {}

  @Post('analyze/:heroId')
  forceAnalyze(@Param('heroId', ParseIntPipe) heroId: number): Promise<RoleAnalysis> {
    return this.aiAnalysisService.forceAnalyze(heroId);
  }
}
