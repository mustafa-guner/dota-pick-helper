export interface PatchSummary {
  version: string;
  patchTimestamp: number;
}

export interface HeroPatchChangeNote {
  indentLevel?: number;
  note: string;
  icon?: string;
}

export interface HeroAbilityPatchNote {
  abilityId: number;
  notes: HeroPatchChangeNote[];
}

export interface HeroPatchChange {
  heroId: number;
  patchVersion: string;
  heroNotes: HeroPatchChangeNote[];
  abilityNotes: HeroAbilityPatchNote[];
}
