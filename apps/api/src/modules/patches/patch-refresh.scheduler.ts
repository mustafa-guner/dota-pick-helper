import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PatchesService } from './patches.service';

// PATCH_REFRESH_CRON (.env) documents the intended cadence, but @Cron's expression must be
// resolvable at class-decoration time, before ConfigModule has loaded .env — so it's fixed here.
const DEFAULT_CRON_EXPRESSION = '0 */6 * * *';

@Injectable()
export class PatchRefreshScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(PatchRefreshScheduler.name);

  constructor(private readonly patchesService: PatchesService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.refresh();
  }

  @Cron(DEFAULT_CRON_EXPRESSION)
  async refresh(): Promise<void> {
    try {
      const snapshot = await this.patchesService.getOrRefreshLatest();
      this.logger.log(`Current live patch: ${snapshot.version}`);
    } catch (error) {
      this.logger.warn(`Patch refresh check failed: ${(error as Error).message}`);
    }
  }
}
