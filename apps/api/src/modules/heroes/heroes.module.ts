import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hero } from './entities/hero.entity';
import { HeroesController } from './heroes.controller';
import { HeroesService } from './heroes.service';
import { HeroSyncService } from './hero-sync.service';
import { PatchesModule } from '../patches/patches.module';
import { AiAnalysisModule } from '../ai-analysis/ai-analysis.module';

@Module({
  imports: [TypeOrmModule.forFeature([Hero]), HttpModule, PatchesModule, AiAnalysisModule],
  controllers: [HeroesController],
  providers: [HeroesService, HeroSyncService],
  exports: [HeroesService],
})
export class HeroesModule {}
