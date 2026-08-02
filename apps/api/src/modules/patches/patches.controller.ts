import { Controller, Get } from '@nestjs/common';
import { PatchSummary } from '@dota-pick-helper/shared-types';
import { PatchesService } from './patches.service';

@Controller('patches')
export class PatchesController {
  constructor(private readonly patchesService: PatchesService) {}

  @Get('latest')
  async latest(): Promise<PatchSummary> {
    const snapshot = await this.patchesService.getOrRefreshLatest();
    return { version: snapshot.version, patchTimestamp: snapshot.patchTimestamp };
  }

  @Get()
  async history(): Promise<PatchSummary[]> {
    const snapshots = await this.patchesService.listHistory();
    return snapshots.map((s) => ({ version: s.version, patchTimestamp: s.patchTimestamp }));
  }
}
