import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface YouTubeSearchResultItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchResultItem[];
}

export interface ResolvedChannel {
  id: string;
  title: string;
}

interface YouTubeChannelsResponse {
  items: { id: string; snippet: { title: string } }[];
}

const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';

@Injectable()
export class YouTubeClientService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  isConfigured(): boolean {
    return !!this.configService.get<string>('youtubeApiKey');
  }

  /** search.list costs 100 quota units per call regardless of parameters — this project's daily
   * budget is 100 units total, i.e. exactly one call/day. Pulling a channel's recent uploads in
   * one call (up to 50 results) is far more efficient than one call per hero. */
  async getChannelUploads(channelId: string, maxResults: number): Promise<YouTubeSearchResultItem[]> {
    const apiKey = this.configService.get<string>('youtubeApiKey');
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY is not configured');
    }

    const res = await firstValueFrom(
      this.httpService.get<YouTubeSearchResponse>(SEARCH_URL, {
        params: {
          part: 'snippet',
          type: 'video',
          channelId,
          order: 'date',
          maxResults,
          key: apiKey,
        },
      }),
    );
    return res.data.items ?? [];
  }

  /** channels.list is a separate, much cheaper quota bucket than search.list (verified live —
   * it kept working after search.list was already exhausted for the day). Used to resolve a
   * pasted channel URL/@handle to its real channel ID without touching the precious 100-unit
   * search budget. */
  async resolveChannelById(channelId: string): Promise<ResolvedChannel | null> {
    return this.resolveChannel({ id: channelId });
  }

  async resolveChannelByHandle(handle: string): Promise<ResolvedChannel | null> {
    return this.resolveChannel({ forHandle: handle });
  }

  private async resolveChannel(
    params: { id: string } | { forHandle: string },
  ): Promise<ResolvedChannel | null> {
    const apiKey = this.configService.get<string>('youtubeApiKey');
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY is not configured');
    }

    const res = await firstValueFrom(
      this.httpService.get<YouTubeChannelsResponse>(CHANNELS_URL, {
        params: { part: 'snippet', key: apiKey, ...params },
      }),
    );
    const item = res.data.items?.[0];
    return item ? { id: item.id, title: item.snippet.title } : null;
  }
}
