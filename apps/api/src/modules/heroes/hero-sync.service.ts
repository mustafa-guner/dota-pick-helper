import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { HeroAbility, HeroTalent } from '@dota-pick-helper/shared-types';
import { Hero } from './entities/hero.entity';

const STEAM_CDN_BASE = 'https://cdn.cloudflare.steamstatic.com';
const TALENT_TIER_LEVELS = [10, 15, 20, 25];

interface OpenDotaHero {
  id: number;
  name: string;
  localized_name: string;
  primary_attr: 'str' | 'agi' | 'int' | 'all';
  attack_type: 'Melee' | 'Ranged';
  roles: string[];
}

interface OpenDotaHeroStats {
  id: number;
  img: string;
  icon: string;
  base_health: number;
  base_mana: number;
  base_armor: number;
  base_attack_min: number;
  base_attack_max: number;
  move_speed: number;
  base_str: number;
  base_agi: number;
  base_int: number;
  str_gain: number;
  agi_gain: number;
  int_gain: number;
}

interface OpenDotaAbilityMeta {
  abilities: string[];
  talents: { name: string; level: number }[];
}

interface OpenDotaAbilityDef {
  dname?: string;
  desc?: string;
  behavior?: string;
  dmg_type?: string;
}

@Injectable()
export class HeroSyncService {
  private readonly logger = new Logger(HeroSyncService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Hero) private readonly heroRepository: Repository<Hero>,
  ) {}

  async syncAll(): Promise<{ synced: number }> {
    const base = this.configService.getOrThrow<string>('openDotaBaseUrl');

    const [heroesRes, statsRes, heroAbilitiesRes, abilitiesRes] = await Promise.all([
      firstValueFrom(this.httpService.get<OpenDotaHero[]>(`${base}/heroes`)),
      firstValueFrom(this.httpService.get<OpenDotaHeroStats[]>(`${base}/heroStats`)),
      firstValueFrom(
        this.httpService.get<Record<string, OpenDotaAbilityMeta>>(
          `${base}/constants/hero_abilities`,
        ),
      ),
      firstValueFrom(
        this.httpService.get<Record<string, OpenDotaAbilityDef>>(`${base}/constants/abilities`),
      ),
    ]);

    const statsById = new Map(statsRes.data.map((s) => [s.id, s]));
    const abilityDefs = abilitiesRes.data;
    const heroAbilities = heroAbilitiesRes.data;

    const entities = heroesRes.data.map((hero) =>
      this.buildHeroEntity(hero, statsById.get(hero.id), heroAbilities[hero.name], abilityDefs),
    );

    await this.heroRepository.save(entities);
    this.logger.log(`Synced ${entities.length} heroes from OpenDota`);
    return { synced: entities.length };
  }

  private buildHeroEntity(
    hero: OpenDotaHero,
    stats: OpenDotaHeroStats | undefined,
    abilityMeta: OpenDotaAbilityMeta | undefined,
    abilityDefs: Record<string, OpenDotaAbilityDef>,
  ): Hero {
    const entity = new Hero();
    entity.id = hero.id;
    entity.internalName = hero.name;
    entity.localizedName = hero.localized_name;
    entity.primaryAttr = hero.primary_attr;
    entity.attackType = hero.attack_type;
    entity.communityRoles = hero.roles ?? [];
    entity.imageUrl = stats ? `${STEAM_CDN_BASE}${stats.img.replace(/\?$/, '')}` : '';
    entity.iconUrl = stats ? `${STEAM_CDN_BASE}${stats.icon.replace(/\?$/, '')}` : '';
    entity.abilities = this.buildAbilities(abilityMeta, abilityDefs);
    entity.talents = this.buildTalents(abilityMeta, abilityDefs);
    entity.baseStats = {
      baseHealth: stats?.base_health ?? 0,
      baseMana: stats?.base_mana ?? 0,
      baseArmor: stats?.base_armor ?? 0,
      baseDamageMin: stats?.base_attack_min ?? 0,
      baseDamageMax: stats?.base_attack_max ?? 0,
      moveSpeed: stats?.move_speed ?? 0,
      baseStr: stats?.base_str ?? 0,
      baseAgi: stats?.base_agi ?? 0,
      baseInt: stats?.base_int ?? 0,
      strGain: stats?.str_gain ?? 0,
      agiGain: stats?.agi_gain ?? 0,
      intGain: stats?.int_gain ?? 0,
    };
    entity.lastSyncedAt = new Date();
    return entity;
  }

  private buildAbilities(
    abilityMeta: OpenDotaAbilityMeta | undefined,
    abilityDefs: Record<string, OpenDotaAbilityDef>,
  ): HeroAbility[] {
    if (!abilityMeta) return [];
    return abilityMeta.abilities
      .map((name, index) => ({ name, index, def: abilityDefs[name] }))
      .filter(({ def }) => !!def?.dname)
      .map(({ name, index, def }) => ({
        id: index,
        name,
        localizedName: def!.dname!,
        description: def!.desc ?? '',
        behavior: def!.behavior,
        damageType: def!.dmg_type,
      }));
  }

  private buildTalents(
    abilityMeta: OpenDotaAbilityMeta | undefined,
    abilityDefs: Record<string, OpenDotaAbilityDef>,
  ): HeroTalent[] {
    if (!abilityMeta) return [];
    return abilityMeta.talents.map((talent, index) => {
      const def = abilityDefs[talent.name];
      const description = (def?.dname ?? talent.name).replace(/\{s:[a-z_]+\}/gi, 'X');
      return {
        level: TALENT_TIER_LEVELS[talent.level - 1] ?? talent.level,
        slot: index % 2 === 0 ? 'left' : 'right',
        description,
      };
    });
  }
}
