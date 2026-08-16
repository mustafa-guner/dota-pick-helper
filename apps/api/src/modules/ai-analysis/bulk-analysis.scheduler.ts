import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BulkAnalysisService } from './bulk-analysis.service';

// See patch-refresh.scheduler.ts for why this is a fixed literal rather than env-driven
// (the @Cron expression must be resolvable at class-decoration time, before .env is loaded).
const DEFAULT_CRON_EXPRESSION = '0 0 * * *';

@Injectable()
export class BulkAnalysisScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(BulkAnalysisScheduler.name);

  constructor(private readonly bulkAnalysisService: BulkAnalysisService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.check();
  }

  @Cron(DEFAULT_CRON_EXPRESSION)
  async check(): Promise<void> {
    try {
      const status = await this.bulkAnalysisService.checkAndQueue();
      if (status.total > 0) {
        this.logger.log(`Queued ${status.total} heroes for analysis on patch ${status.patchVersion}`);
      } else {
        this.logger.log(`All heroes already analyzed for patch ${status.patchVersion}`);
      }
    } catch (error) {
      this.logger.warn(`Scheduled bulk analysis check failed: ${(error as Error).message}`);
    }
  }
}
