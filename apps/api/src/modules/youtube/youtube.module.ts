import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hero } from '../heroes/entities/hero.entity';
import { PatchesModule } from '../patches/patches.module';
import { VideoInsight } from './entities/video-insight.entity';
import { YouTubeClientService } from './youtube-client.service';
import { YouTubeCollectorService } from './youtube-collector.service';
import { YouTubeCollectionScheduler } from './youtube-collector.scheduler';
import { YouTubeService } from './youtube.service';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Hero, VideoInsight]), PatchesModule],
  providers: [
    YouTubeClientService,
    YouTubeCollectorService,
    YouTubeCollectionScheduler,
    YouTubeService,
  ],
  exports: [YouTubeCollectorService, YouTubeService],
})
export class YouTubeModule {}
