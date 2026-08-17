import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface ExplorerResponse<T> {
  rows: T[];
  err: string | null;
}

/** Thin client for OpenDota's /explorer endpoint — runs read SQL against their parsed-match
 * dataset. See match-stats-collector.service.ts for the queries and their constraints (verified
 * live: per-hero-scoped queries run in ~1s, broad unfiltered aggregates time out). */
@Injectable()
export class OpenDotaExplorerService {
  private readonly logger = new Logger(OpenDotaExplorerService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async runQuery<T>(sql: string): Promise<T[]> {
    const base = this.configService.getOrThrow<string>('openDotaBaseUrl');
    const res = await firstValueFrom(
      this.httpService.get<ExplorerResponse<T>>(`${base}/explorer`, { params: { sql } }),
    );

    if (res.data.err) {
      this.logger.warn(`Explorer query failed: ${res.data.err}`);
      throw new InternalServerErrorException(`OpenDota Explorer query failed: ${res.data.err}`);
    }

    return res.data.rows;
  }
}
