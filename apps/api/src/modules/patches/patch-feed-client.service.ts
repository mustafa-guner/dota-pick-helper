import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface PatchListEntry {
  patch_number: string;
  patch_name: string;
  patch_timestamp: number;
}

export interface PatchNoteLine {
  indent_level?: number;
  note: string;
  icon?: string;
}

export interface PatchNoteHeroEntry {
  hero_id: number;
  hero_notes?: PatchNoteLine[];
  abilities?: { ability_id: number; ability_notes?: PatchNoteLine[] }[];
}

export interface PatchNotesResponse {
  patch_number: string;
  patch_name: string;
  patch_timestamp: number;
  general_notes?: unknown;
  items?: unknown;
  neutral_items?: unknown;
  heroes?: PatchNoteHeroEntry[];
  success: number;
}

/** Wraps the two undocumented-but-stable JSON endpoints behind dota2.com/patches. */
@Injectable()
export class PatchFeedClientService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async fetchPatchList(): Promise<PatchListEntry[]> {
    const base = this.configService.getOrThrow<string>('dota2DatafeedBaseUrl');
    const res = await firstValueFrom(
      this.httpService.get<{ patches: PatchListEntry[] }>(
        `${base}/patchnoteslist?language=english`,
      ),
    );
    return res.data.patches;
  }

  async fetchPatchNotes(version: string): Promise<PatchNotesResponse> {
    const base = this.configService.getOrThrow<string>('dota2DatafeedBaseUrl');
    const res = await firstValueFrom(
      this.httpService.get<PatchNotesResponse>(
        `${base}/patchnotes?version=${encodeURIComponent(version)}&language=english`,
      ),
    );
    return res.data;
  }
}
