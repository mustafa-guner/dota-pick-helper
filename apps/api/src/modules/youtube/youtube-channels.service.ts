import { BadRequestException, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YouTubeChannelDto } from '@dota-pick-helper/shared-types';
import { YouTubeChannel } from './entities/youtube-channel.entity';
import { YouTubeClientService } from './youtube-client.service';

// Resolved live via the API on 2026-08-18, before this became user-configurable. Seeded once on
// an empty table so the channels already in use aren't lost when this feature ships.
const SEED_CHANNELS = [
  { id: 'UCdk_9kcWld5UvflPR3W7A2w', label: 'Dota2 HighSchool' },
  { id: 'UCwI9DhoGEziLUxTpK8H77jw', label: 'Dota 2 Pro Gameplay [Watch & Learn]' },
  { id: 'UCC5u0MD-ofrXeauRjIJkrpQ', label: 'Dota 2 ENE TV' },
];

const CHANNEL_ID_PATTERN = /UC[0-9A-Za-z_-]{22}/;
const HANDLE_PATTERN = /@([\w.-]+)/;

@Injectable()
export class YouTubeChannelsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(YouTubeChannelsService.name);

  constructor(
    @InjectRepository(YouTubeChannel)
    private readonly channelRepository: Repository<YouTubeChannel>,
    private readonly youtubeClient: YouTubeClientService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existingCount = await this.channelRepository.count();
    if (existingCount > 0) return;

    await this.channelRepository.save(
      SEED_CHANNELS.map((c) => this.channelRepository.create({ channelId: c.id, label: c.label })),
    );
    this.logger.log(`Seeded ${SEED_CHANNELS.length} default YouTube channels`);
  }

  async list(): Promise<YouTubeChannelDto[]> {
    const rows = await this.channelRepository.find({ order: { addedAt: 'ASC' } });
    return rows.map((row) => this.toDto(row));
  }

  /**
   * Resolves a pasted channel URL, @handle, or bare channel ID via channels.list — a separate,
   * much cheaper quota bucket than search.list (verified live: it kept working after
   * search.list was already exhausted for the day). Deliberately never falls back to
   * search.list for a plain name — that would cost the entire daily search budget in one call.
   */
  async add(input: string): Promise<YouTubeChannelDto> {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new BadRequestException('Enter a channel URL, @handle, or channel ID.');
    }

    const idMatch = trimmed.match(CHANNEL_ID_PATTERN);
    const handleMatch = trimmed.match(HANDLE_PATTERN);

    let resolved;
    if (idMatch) {
      resolved = await this.youtubeClient.resolveChannelById(idMatch[0]);
    } else if (handleMatch) {
      resolved = await this.youtubeClient.resolveChannelByHandle(handleMatch[1]);
    } else {
      // Bare input with neither pattern — try it as a handle as a last resort (covers e.g. a
      // handle pasted without the @).
      resolved = await this.youtubeClient.resolveChannelByHandle(trimmed);
    }

    if (!resolved) {
      throw new BadRequestException(
        'Could not resolve that channel. Paste the channel URL (youtube.com/channel/UC...) or ' +
          '@handle instead of a plain name — name search would cost the entire daily API quota.',
      );
    }

    const existing = await this.channelRepository.findOneBy({ channelId: resolved.id });
    if (existing) return this.toDto(existing);

    const saved = await this.channelRepository.save(
      this.channelRepository.create({ channelId: resolved.id, label: resolved.title }),
    );
    return this.toDto(saved);
  }

  async remove(id: string): Promise<void> {
    await this.channelRepository.delete({ id });
  }

  private toDto(entity: YouTubeChannel): YouTubeChannelDto {
    return {
      id: entity.id,
      label: entity.label,
      channelId: entity.channelId,
      addedAt: entity.addedAt.toISOString(),
    };
  }
}
