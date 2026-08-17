import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { HeroPatchChange as HeroPatchChangeDto } from '@dota-pick-helper/shared-types';
import { PatchFeedClientService } from './patch-feed-client.service';
import { PatchSnapshot } from './entities/patch-snapshot.entity';
import { HeroPatchChange } from './entities/hero-patch-change.entity';

@Injectable()
export class PatchesService {
  private readonly logger = new Logger(PatchesService.name);

  constructor(
    private readonly patchFeedClient: PatchFeedClientService,
    @InjectRepository(PatchSnapshot)
    private readonly patchRepository: Repository<PatchSnapshot>,
    @InjectRepository(HeroPatchChange)
    private readonly heroPatchChangeRepository: Repository<HeroPatchChange>,
  ) {}

  /** Returns the cached snapshot for the current live patch, ingesting it first if it's new. */
  async getOrRefreshLatest(): Promise<PatchSnapshot> {
    const patchList = await this.patchFeedClient.fetchPatchList();
    const latest = [...patchList].sort((a, b) => b.patch_timestamp - a.patch_timestamp)[0];

    const existing = await this.patchRepository.findOneBy({ version: latest.patch_number });
    if (existing) return existing;

    return this.ingestSnapshot(latest.patch_number);
  }

  async getSnapshotByVersion(version: string): Promise<PatchSnapshot | null> {
    return this.patchRepository.findOneBy({ version });
  }

  async listHistory(): Promise<PatchSnapshot[]> {
    return this.patchRepository.find({ order: { patchTimestamp: 'DESC' } });
  }

  async getHeroChange(heroId: number, patch: PatchSnapshot): Promise<HeroPatchChangeDto | null> {
    const change = await this.heroPatchChangeRepository.findOneBy({ heroId, patchId: patch.id });
    if (!change) return null;
    return {
      heroId: change.heroId,
      patchVersion: patch.version,
      heroNotes: change.heroNotes,
      abilityNotes: change.abilityNotes,
    };
  }

  private async ingestSnapshot(version: string): Promise<PatchSnapshot> {
    const notes = await this.patchFeedClient.fetchPatchNotes(version);

    let snapshot: PatchSnapshot;
    try {
      snapshot = await this.patchRepository.save(
        this.patchRepository.create({
          version: notes.patch_number,
          patchTimestamp: notes.patch_timestamp,
          rawData: notes as unknown as Record<string, unknown>,
        }),
      );
    } catch (error) {
      // Another request ingested the same patch concurrently — fall back to reading it.
      if (error instanceof QueryFailedError) {
        const existing = await this.patchRepository.findOneBy({ version });
        if (existing) return existing;
      }
      throw error;
    }

    const heroEntries = notes.heroes ?? [];
    const changeRows = heroEntries.map((entry) =>
      this.heroPatchChangeRepository.create({
        heroId: entry.hero_id,
        patchId: snapshot.id,
        heroNotes: (entry.hero_notes ?? []).map((n) => ({
          indentLevel: n.indent_level,
          note: n.note,
          icon: n.icon,
        })),
        abilityNotes: (entry.abilities ?? []).map((a) => ({
          abilityId: a.ability_id,
          notes: (a.ability_notes ?? []).map((n) => ({
            indentLevel: n.indent_level,
            note: n.note,
            icon: n.icon,
          })),
        })),
      }),
    );

    if (changeRows.length) {
      await this.heroPatchChangeRepository.save(changeRows);
    }

    this.logger.log(`Ingested patch ${snapshot.version} with ${changeRows.length} hero changes`);
    return snapshot;
  }
}
