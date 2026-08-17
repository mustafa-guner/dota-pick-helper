import {
  Body,
  Controller,
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
} from '@dota-pick-helper/shared-types';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminService } from './admin.service';
import { LoginDto } from './dto/login.dto';
import { HeroSyncService } from '../heroes/hero-sync.service';
import { AiAnalysisService } from '../ai-analysis/ai-analysis.service';
import { BulkAnalysisService } from '../ai-analysis/bulk-analysis.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly adminService: AdminService,
    private readonly heroSyncService: HeroSyncService,
    private readonly aiAnalysisService: AiAnalysisService,
    private readonly bulkAnalysisService: BulkAnalysisService,
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
}
