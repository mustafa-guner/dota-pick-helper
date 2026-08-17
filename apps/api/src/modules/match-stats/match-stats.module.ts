import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hero } from '../heroes/entities/hero.entity';
import { HeroLaneStats } from './entities/hero-lane-stats.entity';
import { OpenDotaExplorerService } from './opendota-explorer.service';
import { MatchStatsCollectorService } from './match-stats-collector.service';
import { MatchStatsService } from './match-stats.service';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Hero, HeroLaneStats])],
  providers: [OpenDotaExplorerService, MatchStatsCollectorService, MatchStatsService],
  exports: [MatchStatsCollectorService, MatchStatsService],
})
export class MatchStatsModule {}
