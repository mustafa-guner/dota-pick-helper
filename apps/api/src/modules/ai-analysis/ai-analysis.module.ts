import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hero } from '../heroes/entities/hero.entity';
import { PatchesModule } from '../patches/patches.module';
import { MatchStatsModule } from '../match-stats/match-stats.module';
import { AiAnalysisService } from './ai-analysis.service';
import { OllamaClientService } from './ollama-client.service';
import { RoleScoringService } from './role-scoring.service';
import { HeroRoleAnalysis } from './entities/hero-role-analysis.entity';
import { BulkAnalysisService } from './bulk-analysis.service';
import { BulkAnalysisScheduler } from './bulk-analysis.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([Hero, HeroRoleAnalysis]), PatchesModule, MatchStatsModule],
  providers: [
    OllamaClientService,
    RoleScoringService,
    AiAnalysisService,
    BulkAnalysisService,
    BulkAnalysisScheduler,
  ],
  exports: [AiAnalysisService, BulkAnalysisService],
})
export class AiAnalysisModule {}
