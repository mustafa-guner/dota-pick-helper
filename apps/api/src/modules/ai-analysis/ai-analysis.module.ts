import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hero } from '../heroes/entities/hero.entity';
import { PatchesModule } from '../patches/patches.module';
import { AiAnalysisController } from './ai-analysis.controller';
import { AiAnalysisService } from './ai-analysis.service';
import { OllamaClientService } from './ollama-client.service';
import { HeroRoleAnalysis } from './entities/hero-role-analysis.entity';
import { BulkAnalysisService } from './bulk-analysis.service';
import { BulkAnalysisScheduler } from './bulk-analysis.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([Hero, HeroRoleAnalysis]), PatchesModule],
  controllers: [AiAnalysisController],
  providers: [OllamaClientService, AiAnalysisService, BulkAnalysisService, BulkAnalysisScheduler],
  exports: [AiAnalysisService],
})
export class AiAnalysisModule {}
