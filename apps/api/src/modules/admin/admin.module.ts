import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hero } from '../heroes/entities/hero.entity';
import { HeroRoleAnalysis } from '../ai-analysis/entities/hero-role-analysis.entity';
import { HeroesModule } from '../heroes/heroes.module';
import { AiAnalysisModule } from '../ai-analysis/ai-analysis.module';
import { PatchesModule } from '../patches/patches.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthGuard } from './admin-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Hero, HeroRoleAnalysis]),
    HeroesModule,
    AiAnalysisModule,
    PatchesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthService, AdminAuthGuard],
})
export class AdminModule {}
