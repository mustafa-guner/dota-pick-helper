import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('video_insights')
@Unique(['heroId', 'patchVersion', 'videoId'])
export class VideoInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hero_id' })
  heroId: number;

  @Column({ name: 'patch_id' })
  patchId: string;

  @Column({ name: 'patch_version' })
  patchVersion: string;

  @Column({ name: 'video_id' })
  videoId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'channel_title' })
  channelTitle: string;

  @Column({ name: 'published_at', type: 'timestamptz' })
  publishedAt: Date;

  @Column({ name: 'collected_at', type: 'timestamptz' })
  collectedAt: Date;
}
