import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Hero } from '../heroes/entities/hero.entity';
import { PatchSnapshot } from '../patches/entities/patch-snapshot.entity';
import { PatchesService } from '../patches/patches.service';
import { VideoInsight } from './entities/video-insight.entity';
import { YouTubeClientService } from './youtube-client.service';

const RESULTS_PER_HERO = 3;
// Safety cap regardless of how many heroes a patch touches: 50 searches x 100 quota units/search
// = 5000, half the YouTube Data API's default 10,000/day budget, leaving headroom for the rest
// of the day's usage (or a manual re-run).
const MAX_HEROES_PER_RUN = 50;
const DELAY_BETWEEN_SEARCHES_MS = 500;

interface CollectorStatus {
  lastCollectedAt: string | null;
  patchVersion: string | null;
  heroesCovered: number;
}

/**
 * Once-daily (see youtube-collector.scheduler.ts) — searches YouTube for videos about heroes
 * actually changed in the current patch and stores the top few as VideoInsight rows, purely as
 * extra context for the AI's summary text (see role-analysis.prompt.ts) — never used to decide
 * roles, which remain fully stats-driven (role-scoring.service.ts). Scoped to patch-changed
 * heroes only: that's where fresh commentary is most likely to exist, and it keeps daily search
 * volume well under the API's quota.
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
    private readonly patchesService: PatchesService,
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

    const heroIds = (await this.patchesService.listChangedHeroIds(patch)).slice(
      0,
      MAX_HEROES_PER_RUN,
    );
    if (heroIds.length === 0) {
      this.status = {
        lastCollectedAt: new Date().toISOString(),
        patchVersion: patch.version,
        heroesCovered: 0,
      };
      return;
    }

    const heroes = await this.heroRepository.findBy({ id: In(heroIds) });

    let covered = 0;
    for (const hero of heroes) {
      try {
        await this.collectForOneHero(hero, patch);
        covered += 1;
      } catch (error) {
        this.logger.warn(
          `YouTube collection failed for hero ${hero.id}: ${(error as Error).message}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_SEARCHES_MS));
    }

    this.status = {
      lastCollectedAt: new Date().toISOString(),
      patchVersion: patch.version,
      heroesCovered: covered,
    };
    this.logger.log(
      `YouTube collection finished for patch ${patch.version}: ${covered} heroes searched`,
    );
  }

  private async collectForOneHero(hero: Hero, patch: PatchSnapshot): Promise<void> {
    const query = `${hero.localizedName} ${patch.version} guide`;
    const results = await this.youtubeClient.search(query, RESULTS_PER_HERO);

    await this.videoInsightRepository.delete({ heroId: hero.id, patchVersion: patch.version });

    const rows = results
      .filter((item) => !!item.id?.videoId)
      .map((item) =>
        this.videoInsightRepository.create({
          heroId: hero.id,
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

    if (rows.length > 0) {
      await this.videoInsightRepository.save(rows);
    }
  }
}
