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

  getVideoInsights(heroId: number, patchVersion: string): Promise<VideoInsight[]> {
    return this.videoInsightRepository.find({
      where: { heroId, patchVersion },
      order: { publishedAt: 'DESC' },
    });
  }
}
