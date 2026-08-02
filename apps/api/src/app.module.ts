import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { HeroesModule } from './modules/heroes/heroes.module';
import { PatchesModule } from './modules/patches/patches.module';
import { AiAnalysisModule } from './modules/ai-analysis/ai-analysis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validationSchema }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    PatchesModule,
    AiAnalysisModule,
    HeroesModule,
  ],
})
export class AppModule {}
