import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hero } from '../heroes/entities/hero.entity';
import { PatchSnapshot } from '../patches/entities/patch-snapshot.entity';
import { VideoInsight } from './entities/video-insight.entity';
import { YouTubeClientService, YouTubeSearchResultItem } from './youtube-client.service';

// User-specified channels (resolved to channel IDs live via the API on 2026-08-18). Only one
// gets searched per collection run (see MIN_HOURS_BETWEEN_RUNS below) — rotates day by day so
// each channel gets refreshed roughly every 3rd day.
const CHANNELS = [
  { id: 'UCdk_9kcWld5UvflPR3W7A2w', name: 'Dota2 HighSchool' },
  { id: 'UCwI9DhoGEziLUxTpK8H77jw', name: 'Dota 2 Pro Gameplay [Watch & Learn]' },
  { id: 'UCC5u0MD-ofrXeauRjIJkrpQ', name: 'Dota 2 ENE TV' },
];

const RESULTS_PER_RUN = 50; // YouTube's max per search.list call
// This project's real YouTube Data API quota is 100 units/day (verified live, not the commonly
// documented 10,000 default), and search.list costs 100 units flat regardless of parameters —
// so the budget is exactly one search call per day. Guard is DB-backed (last VideoInsight's
// collectedAt), not in-memory, so a redeploy can't cause two runs the same day and blow the
// budget — in-memory state resets on every restart, the database doesn't.
const MIN_HOURS_BETWEEN_RUNS = 20;

interface CollectorStatus {
  lastCollectedAt: string | null;
  patchVersion: string | null;
  heroesCovered: number;
}

/**
 * Once-daily (see youtube-collector.scheduler.ts) — pulls one channel's recent uploads (rotating
 * through CHANNELS) and matches hero names out of the title/description text, storing hits as
 * VideoInsight rows. Purely extra context for the AI's summary text (role-analysis.prompt.ts) —
 * never used to decide roles, which remain fully stats-driven (role-scoring.service.ts).
 */
@Injectable()
export class YouTubeCollectorService {
  private readonly logger = new Logger(YouTubeCollectorService.name);
  private status: CollectorStatus = {
    lastCollectedAt: null,
    patchVersion: null,
    heroesCovered: 0,
  };

  constructor(
    @InjectRepository(Hero) private readonly heroRepository: Repository<Hero>,
    @InjectRepository(VideoInsight)
    private readonly videoInsightRepository: Repository<VideoInsight>,
    private readonly youtubeClient: YouTubeClientService,
  ) {}

  getStatus(): CollectorStatus {
    return { ...this.status };
  }

  async collectForPatch(patch: PatchSnapshot): Promise<void> {
    if (!this.youtubeClient.isConfigured()) {
      this.logger.warn('YOUTUBE_API_KEY not set — skipping video collection');
      return;
    }

    const mostRecent = await this.videoInsightRepository.findOne({
      order: { collectedAt: 'DESC' },
    });
    if (mostRecent && Date.now() - mostRecent.collectedAt.getTime() < MIN_HOURS_BETWEEN_RUNS * 3_600_000) {
      this.logger.log('Skipping YouTube collection — ran too recently (quota guard: ~1 search/day budget)');
      return;
    }

    const channel = CHANNELS[this.pickChannelIndex()];
    const heroes = await this.heroRepository.find();

    let results;
    try {
      results = await this.youtubeClient.getChannelUploads(channel.id, RESULTS_PER_RUN);
    } catch (error) {
      this.logger.warn(`YouTube collection failed: ${(error as Error).message}`);
      return;
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

    this.status = {
      lastCollectedAt: new Date().toISOString(),
      patchVersion: patch.version,
      heroesCovered: heroesCovered.size,
    };
    this.logger.log(
      `YouTube collection finished (channel: ${channel.name}): ${heroesCovered.size} heroes matched across ${results.length} videos`,
    );
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

  private pickChannelIndex(): number {
    return Math.floor(Date.now() / 86_400_000) % CHANNELS.length;
  }
}
