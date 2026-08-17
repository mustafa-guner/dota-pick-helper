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

const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

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
}
