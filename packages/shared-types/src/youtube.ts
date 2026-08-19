export interface YouTubeChannelDto {
  id: string;
  label: string;
  channelId: string;
  addedAt: string;
}

export interface YouTubeCollectorStatus {
  lastCollectedAt: string | null;
  patchVersion: string | null;
  heroesCovered: number;
}
