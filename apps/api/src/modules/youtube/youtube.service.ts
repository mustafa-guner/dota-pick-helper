import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoInsight } from './entities/video-insight.entity';

@Injectable()
export class YouTubeService {
  constructor(
    @InjectRepository(VideoInsight)
    private readonly videoInsightRepository: Repository<VideoInsight>,
  ) {}

  // Capped since videos now accumulate across days as the channel rotation covers different
  // sources — without a cap this would grow unbounded and bloat the summary prompt over time.
  getVideoInsights(heroId: number, patchVersion: string): Promise<VideoInsight[]> {
    return this.videoInsightRepository.find({
      where: { heroId, patchVersion },
      order: { publishedAt: 'DESC' },
      take: 5,
    });
  }
}
