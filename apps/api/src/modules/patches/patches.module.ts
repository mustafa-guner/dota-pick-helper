import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatchSnapshot } from './entities/patch-snapshot.entity';
import { HeroPatchChange } from './entities/hero-patch-change.entity';
import { PatchFeedClientService } from './patch-feed-client.service';
import { PatchesService } from './patches.service';
import { PatchesController } from './patches.controller';
import { PatchRefreshScheduler } from './patch-refresh.scheduler';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([PatchSnapshot, HeroPatchChange])],
  controllers: [PatchesController],
  providers: [PatchFeedClientService, PatchesService, PatchRefreshScheduler],
  exports: [PatchesService],
})
export class PatchesModule {}
