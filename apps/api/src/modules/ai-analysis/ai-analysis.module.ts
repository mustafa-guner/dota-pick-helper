import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hero } from '../heroes/entities/hero.entity';
import { PatchesModule } from '../patches/patches.module';
import { AiAnalysisController } from './ai-analysis.controller';
import { AiAnalysisService } from './ai-analysis.service';
import { ClaudeClientService } from './claude-client.service';
import { HeroRoleAnalysis } from './entities/hero-role-analysis.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Hero, HeroRoleAnalysis]), PatchesModule],
  controllers: [AiAnalysisController],
  providers: [ClaudeClientService, AiAnalysisService],
  exports: [AiAnalysisService],
})
export class AiAnalysisModule {}
