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

  async search(query: string, maxResults: number): Promise<YouTubeSearchResultItem[]> {
    const apiKey = this.configService.get<string>('youtubeApiKey');
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY is not configured');
    }

    const res = await firstValueFrom(
      this.httpService.get<YouTubeSearchResponse>(SEARCH_URL, {
        params: {
          part: 'snippet',
          type: 'video',
          order: 'relevance',
          maxResults,
          q: query,
          key: apiKey,
        },
      }),
    );
    return res.data.items ?? [];
  }
}
