import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeroLaneStats } from './entities/hero-lane-stats.entity';

@Injectable()
export class MatchStatsService {
  constructor(
    @InjectRepository(HeroLaneStats)
    private readonly laneStatsRepository: Repository<HeroLaneStats>,
  ) {}

  getLaneStats(heroId: number, patchVersion: string): Promise<HeroLaneStats[]> {
    return this.laneStatsRepository.find({ where: { heroId, patchVersion } });
  }
}
