import { IsString, MinLength } from 'class-validator';

export class AddYouTubeChannelDto {
  @IsString()
  @MinLength(1)
  input: string;
}
