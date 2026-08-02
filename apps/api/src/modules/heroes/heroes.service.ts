import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hero as HeroDto, HeroesGrouped, HeroSummary } from '@dota-pick-helper/shared-types';
import { Hero } from './entities/hero.entity';

@Injectable()
export class HeroesService {
  constructor(@InjectRepository(Hero) private readonly heroRepository: Repository<Hero>) {}

  async findAllGrouped(): Promise<HeroesGrouped> {
    const heroes = await this.heroRepository.find({ order: { localizedName: 'ASC' } });
    const grouped: HeroesGrouped = { str: [], agi: [], int: [], all: [] };

    for (const hero of heroes) {
      grouped[hero.primaryAttr].push(this.toSummary(hero));
    }

    return grouped;
  }

  async findEntityById(id: number): Promise<Hero> {
    const hero = await this.heroRepository.findOneBy({ id });
    if (!hero) {
      throw new NotFoundException(`Hero ${id} not found — try POST /heroes/sync first`);
    }
    return hero;
  }

  async findById(id: number): Promise<HeroDto> {
    return this.toDto(await this.findEntityById(id));
  }

  async count(): Promise<number> {
    return this.heroRepository.count();
  }

  private toSummary(hero: Hero): HeroSummary {
    return {
      id: hero.id,
      localizedName: hero.localizedName,
      primaryAttr: hero.primaryAttr,
      imageUrl: hero.imageUrl,
      iconUrl: hero.iconUrl,
    };
  }

  private toDto(hero: Hero): HeroDto {
    return {
      id: hero.id,
      internalName: hero.internalName,
      localizedName: hero.localizedName,
      primaryAttr: hero.primaryAttr,
      attackType: hero.attackType,
      imageUrl: hero.imageUrl,
      iconUrl: hero.iconUrl,
      communityRoles: hero.communityRoles,
      abilities: hero.abilities,
      talents: hero.talents,
      baseStats: hero.baseStats,
    };
  }
}
