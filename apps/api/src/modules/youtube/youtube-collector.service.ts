import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Hero } from '../heroes/entities/hero.entity';
import { PatchSnapshot } from '../patches/entities/patch-snapshot.entity';
import { VideoInsight } from './entities/video-insight.entity';
import { YouTubeChannelsService } from './youtube-channels.service';
import { YouTubeClientService, YouTubeSearchResultItem } from './youtube-client.service';

const RESULTS_PER_RUN = 50; // YouTube's max per search.list call
// This project's real YouTube Data API quota is 100 units/day (verified live, not the commonly
// documented 10,000 default), and search.list costs 100 units flat regardless of parameters —
// so the budget is exactly one search call per day. Guard is DB-backed (last VideoInsight's
// collectedAt), not in-memory, so a redeploy can't cause two runs the same day and blow the
// budget — in-memory state resets on every restart, the database doesn't. Manual "collect now"
// triggers (see collectForPatch's `force` param) intentionally bypass this — it exists to stop
// an *accidental* redeploy-triggered double-run, not a deliberate admin action.
const MIN_HOURS_BETWEEN_RUNS = 20;
// Rows inserted within this window of each other are treated as belonging to the same
// collection run, for status-reporting purposes — there's no explicit run/batch id.
const SAME_RUN_WINDOW_MS = 5 * 60_000;

export interface CollectorStatus {
  lastCollectedAt: string | null;
  patchVersion: string | null;
  heroesCovered: number;
}

/**
 * Once-daily (see youtube-collector.scheduler.ts) — pulls one channel's recent uploads (rotating
 * through the admin-configured channels, see youtube-channels.service.ts) and matches hero names
 * out of the title/description text, storing hits as VideoInsight rows. Purely extra context for
 * the AI's summary text (role-analysis.prompt.ts) — never used to decide roles, which remain
 * fully stats-driven (role-scoring.service.ts).
 */
@Injectable()
export class YouTubeCollectorService {
  private readonly logger = new Logger(YouTubeCollectorService.name);

  constructor(
    @InjectRepository(Hero) private readonly heroRepository: Repository<Hero>,
    @InjectRepository(VideoInsight)
    private readonly videoInsightRepository: Repository<VideoInsight>,
    private readonly youtubeChannelsService: YouTubeChannelsService,
    private readonly youtubeClient: YouTubeClientService,
  ) {}

  /** Derived from the database (not in-memory) so it reflects real history even right after a
   * restart — an in-memory field would reset to "Never" on every redeploy despite real past
   * collections. */
  async getStatus(): Promise<CollectorStatus> {
    const mostRecent = await this.videoInsightRepository.findOne({
      where: {},
      order: { collectedAt: 'DESC' },
    });
    if (!mostRecent) {
      return { lastCollectedAt: null, patchVersion: null, heroesCovered: 0 };
    }

    const windowStart = new Date(mostRecent.collectedAt.getTime() - SAME_RUN_WINDOW_MS);
    const recentRows = await this.videoInsightRepository.find({
      where: { collectedAt: MoreThanOrEqual(windowStart) },
    });

    return {
      lastCollectedAt: mostRecent.collectedAt.toISOString(),
      patchVersion: mostRecent.patchVersion,
      heroesCovered: new Set(recentRows.map((row) => row.heroId)).size,
    };
  }

  async collectForPatch(patch: PatchSnapshot, options?: { force?: boolean }): Promise<CollectorStatus> {
    if (!this.youtubeClient.isConfigured()) {
      this.logger.warn('YOUTUBE_API_KEY not set — skipping video collection');
      return this.getStatus();
    }

    if (!options?.force) {
      const mostRecent = await this.videoInsightRepository.findOne({
        where: {},
        order: { collectedAt: 'DESC' },
      });
      if (mostRecent && Date.now() - mostRecent.collectedAt.getTime() < MIN_HOURS_BETWEEN_RUNS * 3_600_000) {
        this.logger.log('Skipping YouTube collection — ran too recently (quota guard: ~1 search/day budget)');
        return this.getStatus();
      }
    }

    const channels = await this.youtubeChannelsService.list();
    if (channels.length === 0) {
      this.logger.warn('No YouTube channels configured — skipping video collection');
      return this.getStatus();
    }

    const channel = channels[Math.floor(Date.now() / 86_400_000) % channels.length];
    const heroes = await this.heroRepository.find();

    let results: YouTubeSearchResultItem[];
    try {
      results = await this.youtubeClient.getChannelUploads(channel.channelId, RESULTS_PER_RUN);
    } catch (error) {
      this.logger.warn(`YouTube collection failed: ${(error as Error).message}`);
      return this.getStatus();
    }

    const heroesCovered = new Set<number>();
    for (const item of results) {
      if (!item.id?.videoId) continue;

      const text = `${item.snippet.title} ${item.snippet.description}`.toLowerCase();
      const matchedHeroes = heroes.filter((hero) => text.includes(hero.localizedName.toLowerCase()));

      for (const hero of matchedHeroes) {
        await this.saveInsight(hero.id, patch, item);
        heroesCovered.add(hero.id);
      }
    }

    this.logger.log(
      `YouTube collection finished (channel: ${channel.label}): ${heroesCovered.size} heroes matched across ${results.length} videos`,
    );
    return this.getStatus();
  }

  private async saveInsight(
    heroId: number,
    patch: PatchSnapshot,
    item: YouTubeSearchResultItem,
  ): Promise<void> {
    const existing = await this.videoInsightRepository.findOneBy({
      heroId,
      patchVersion: patch.version,
      videoId: item.id.videoId,
    });
    if (existing) return; // same video already recorded for this hero — nothing to update

    await this.videoInsightRepository.save(
      this.videoInsightRepository.create({
        heroId,
        patchId: patch.id,
        patchVersion: patch.version,
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        publishedAt: new Date(item.snippet.publishedAt),
        collectedAt: new Date(),
      }),
    );
  }
}
