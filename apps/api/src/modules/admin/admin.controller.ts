import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  AdminHeroSummary,
  AdminMetrics,
  BulkAnalysisStatus,
  RoleAnalysis,
  YouTubeChannelDto,
  YouTubeCollectorStatus,
} from '@dota-pick-helper/shared-types';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminService } from './admin.service';
import { LoginDto } from './dto/login.dto';
import { AddYouTubeChannelDto } from './dto/add-youtube-channel.dto';
import { HeroSyncService } from '../heroes/hero-sync.service';
import { AiAnalysisService } from '../ai-analysis/ai-analysis.service';
import { BulkAnalysisService } from '../ai-analysis/bulk-analysis.service';
import { PatchesService } from '../patches/patches.service';
import { YouTubeChannelsService } from '../youtube/youtube-channels.service';
import { YouTubeCollectorService } from '../youtube/youtube-collector.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly adminService: AdminService,
    private readonly heroSyncService: HeroSyncService,
    private readonly aiAnalysisService: AiAnalysisService,
    private readonly bulkAnalysisService: BulkAnalysisService,
    private readonly patchesService: PatchesService,
    private readonly youtubeChannelsService: YouTubeChannelsService,
    private readonly youtubeCollectorService: YouTubeCollectorService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Req() request: Request): Promise<{ token: string }> {
    const token = await this.adminAuthService.login(
      body.username,
      body.password,
      request.ip ?? 'unknown',
    );
    if (!token) {
      throw new UnauthorizedException('Invalid username or password');
    }
    return { token };
  }

  @Get('metrics')
  @UseGuards(AdminAuthGuard)
  getMetrics(): Promise<AdminMetrics> {
    return this.adminService.getMetrics();
  }

  @Get('heroes')
  @UseGuards(AdminAuthGuard)
  listHeroes(): Promise<AdminHeroSummary[]> {
    return this.adminService.listHeroesWithAnalysis();
  }

  @Post('heroes/sync')
  @UseGuards(AdminAuthGuard)
  syncHeroes(): Promise<{ synced: number }> {
    return this.heroSyncService.syncAll();
  }

  @Post('heroes/:heroId/analyze')
  @UseGuards(AdminAuthGuard)
  analyzeHero(@Param('heroId', ParseIntPipe) heroId: number): Promise<RoleAnalysis> {
    return this.aiAnalysisService.forceAnalyze(heroId);
  }

  @Post('analyze-all')
  @UseGuards(AdminAuthGuard)
  triggerBulkAnalysis(): Promise<BulkAnalysisStatus> {
    return this.bulkAnalysisService.checkAndQueue();
  }

  @Post('reanalyze-all')
  @UseGuards(AdminAuthGuard)
  triggerFullReanalysis(): Promise<BulkAnalysisStatus> {
    return this.bulkAnalysisService.triggerFullReanalysis();
  }

  @Get('analyze-all/status')
  @UseGuards(AdminAuthGuard)
  getBulkAnalysisStatus(): BulkAnalysisStatus {
    return this.bulkAnalysisService.getStatus();
  }

  @Get('youtube/channels')
  @UseGuards(AdminAuthGuard)
  listYoutubeChannels(): Promise<YouTubeChannelDto[]> {
    return this.youtubeChannelsService.list();
  }

  @Post('youtube/channels')
  @UseGuards(AdminAuthGuard)
  addYoutubeChannel(@Body() body: AddYouTubeChannelDto): Promise<YouTubeChannelDto> {
    return this.youtubeChannelsService.add(body.input);
  }

  @Delete('youtube/channels/:id')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeYoutubeChannel(@Param('id') id: string): Promise<{ removed: true }> {
    await this.youtubeChannelsService.remove(id);
    return { removed: true };
  }

  // Bypasses the collector's usual quota guard — a deliberate admin action, not an accidental
  // redeploy-triggered double-run. Costs the entire day's search quota (100 units); confirmed
  // client-side before this is called.
  @Post('youtube/collect-now')
  @UseGuards(AdminAuthGuard)
  async collectYoutubeNow(): Promise<YouTubeCollectorStatus> {
    const patch = await this.patchesService.getOrRefreshLatest();
    return this.youtubeCollectorService.collectForPatch(patch, { force: true });
  }
}
