import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hero } from '../heroes/entities/hero.entity';
import { PatchesModule } from '../patches/patches.module';
import { VideoInsight } from './entities/video-insight.entity';
import { YouTubeChannel } from './entities/youtube-channel.entity';
import { YouTubeClientService } from './youtube-client.service';
import { YouTubeChannelsService } from './youtube-channels.service';
import { YouTubeCollectorService } from './youtube-collector.service';
import { YouTubeCollectionScheduler } from './youtube-collector.scheduler';
import { YouTubeService } from './youtube.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Hero, VideoInsight, YouTubeChannel]),
    PatchesModule,
  ],
  providers: [
    YouTubeClientService,
    YouTubeChannelsService,
    YouTubeCollectorService,
    YouTubeCollectionScheduler,
    YouTubeService,
  ],
  exports: [YouTubeChannelsService, YouTubeCollectorService, YouTubeService],
})
export class YouTubeModule {}
