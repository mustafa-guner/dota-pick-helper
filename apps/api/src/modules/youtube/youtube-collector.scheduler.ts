import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PatchesService } from '../patches/patches.service';
import { YouTubeCollectorService } from './youtube-collector.service';

// See patch-refresh.scheduler.ts for why this is a fixed literal rather than env-driven. Runs
// once daily — deliberately NOT tied to page views, re-analyze clicks, or the analysis pipeline
// at all. This is a slow, quota-limited background job, not something to re-run per request.
const DAILY_CRON_EXPRESSION = '0 3 * * *';

@Injectable()
export class YouTubeCollectionScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(YouTubeCollectionScheduler.name);

  constructor(
    private readonly patchesService: PatchesService,
    private readonly youtubeCollectorService: YouTubeCollectorService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.collect();
  }

  @Cron(DAILY_CRON_EXPRESSION)
  async collect(): Promise<void> {
    try {
      const patch = await this.patchesService.getOrRefreshLatest();
      await this.youtubeCollectorService.collectForPatch(patch);
    } catch (error) {
      this.logger.warn(`Scheduled YouTube collection failed: ${(error as Error).message}`);
    }
  }
}
