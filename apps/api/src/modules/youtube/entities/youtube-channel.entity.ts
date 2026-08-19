import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('youtube_channels')
@Unique(['channelId'])
export class YouTubeChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  label: string;

  @Column({ name: 'channel_id' })
  channelId: string;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}
