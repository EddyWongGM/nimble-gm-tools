import { Listable, FilterDimensions } from "./Listable";
import { GetModifierFromScore, probablyUniqueString } from "./Toolbox";

// Str/Dex/Int/Wis store the modifier directly (e.g. +2), not a raw D&D
// score - that's how a Nimble GM actually thinks about a stat block. Con
// and Cha were dropped: neither has a live Nimble use (concentration is
// Str-based, not Con-based).
export interface AbilityScores {
  Str: number;
  Dex: number;
  Int: number;
  Wis: number;
}

export type AdvantageLevel =
  | "----"
  | "---"
  | "--"
  | "-"
  | ""
  | "+"
  | "++"
  | "+++"
  | "++++";

export interface NameAndAdvantage {
  Name: string;
  Advantage: AdvantageLevel;
}

export interface ValueAndNotes {
  Value: number;
  Notes: string;
}

export interface NameAndContent {
  Name: string;
  Content: string;
  Usage?: string;
}

// What a "2/Safe Rest" or "1/Encounter" Usage string means for charge
// tracking: how many charges, and which player action clears them.
export type ChargeResetTrigger = "safe-rest" | "encounter";

export interface ChargeUsage {
  Max: number;
  ResetOn: ChargeResetTrigger;
}

export type InitiativeSpecialRoll = "advantage" | "disadvantage" | "take-ten";

export type ArmorTier = "" | "medium" | "heavy";

export interface StatBlock extends Listable {
  Source: string;
  Type: string;
  Armor?: ArmorTier;
  HP: ValueAndNotes;
  HPMediumArmor?: ValueAndNotes;
  HPHeavyArmor?: ValueAndNotes;
  LastStandHP?: ValueAndNotes;
  AC: ValueAndNotes;
  Mana?: ValueAndNotes;
  Resources?: ValueAndNotes;
  // Most Nimble resource pools (Mana, Hit Dice) start full and deplete.
  // A few classes (e.g. a Fury-style builder) instead start empty and
  // accumulate toward the max over the course of an encounter - this
  // only changes the starting value, not the spend/restore mechanics.
  ResourcesStartEmpty?: boolean;
  HitDice?: ValueAndNotes;
  Wounds?: ValueAndNotes;
  Speed: string[];
  Abilities: AbilityScores;
  SaveAdvantages?: Partial<Record<keyof AbilityScores, AdvantageLevel>>;
  InitiativeModifier?: number;
  InitiativeSpecialRoll?: InitiativeSpecialRoll;
  InitiativeAdvantage?: boolean;
  DamageVulnerabilities: string[];
  DamageResistances: string[];
  DamageImmunities: string[];
  ConditionImmunities: string[];
  Saves: NameAndAdvantage[];
  Skills: NameAndAdvantage[];
  Senses: string[];
  Languages: string[];
  Challenge: string;
  CRRating?: string;
  SaveDC?: number;
  Traits: NameAndContent[];
  Actions: NameAndContent[];
  Reactions: NameAndContent[];
  LegendaryActions: NameAndContent[];
  BonusActions?: NameAndContent[];
  MythicActions?: NameAndContent[];
  CustomFields?: NameAndContent[];
  Description: string;
  Player: string;
  ImageURL: string;
}

export namespace StatBlock {
  export const VisibleAbilityNames = ["Str", "Dex", "Int", "Wis"];
  export const AbilityDisplayNames: Record<string, string> = {
    Str: "Str",
    Dex: "Dex",
    Int: "Int",
    Wis: "Wil"
  };

  export const ArmorDisplayNames: Record<ArmorTier, string> = {
    "": "Unarmored",
    medium: "Medium Armor",
    heavy: "Heavy Armor"
  };

  export const ArmorTierOrder: ArmorTier[] = ["", "medium", "heavy"];

  export const GetSearchHint = (statBlock: StatBlock): string =>
    statBlock.Type.toLocaleLowerCase().replace(/[^\w\s]/g, "");

  export const FilterDimensions = (statBlock: StatBlock): FilterDimensions => {
    return {
      Level: statBlock.Challenge,
      Source: statBlock.Source,
      // Nimble stat blocks put free text here (e.g. "Goblin", "Boss"),
      // not a D&D creature-type category, so group by the raw value
      // rather than matching against a fixed taxonomy that no longer
      // applies.
      Type: statBlock.Type.trim(),
      Role: statBlock.Player
    };
  };

  // Older saved data (and anything imported from a D&D-format source) still
  // has raw D&D ability scores (3-20) and a Con/Cha pair. Con/Cha's presence
  // is the shape marker - the new shape simply never has those keys - so
  // detecting it doesn't depend on guessing a numeric range. Idempotent and
  // safe to call on already-migrated data.
  export const Update = (statBlock: any): StatBlock => {
    let updated = statBlock;

    const abilities = statBlock?.Abilities;
    if (abilities && ("Con" in abilities || "Cha" in abilities)) {
      updated = {
        ...updated,
        Abilities: {
          Str: GetModifierFromScore(abilities.Str),
          Dex: GetModifierFromScore(abilities.Dex),
          Int: GetModifierFromScore(abilities.Int),
          Wis: GetModifierFromScore(abilities.Wis)
        }
      };
    }

    // "Last Stage" was renamed to "Last Stand"; migrate the old field name
    // so already-authored Legendary monsters keep their configured value.
    if (updated?.LastStageHP && updated?.LastStandHP === undefined) {
      const { LastStageHP, ...rest } = updated;
      updated = {
        ...rest,
        LastStandHP: LastStageHP
      };
    }

    return {
      ...updated,
      Saves: dropLegacyModifierEntries(updated?.Saves),
      Skills: dropLegacyModifierEntries(updated?.Skills),
      // Every ability needs an explicit "" (Normal) entry, not just a missing
      // key - a missing key reads as undefined everywhere else, but the
      // <select> in the editor still needs a real "" match to be reliably
      // controlled by Formik rather than falling back to the DOM's default.
      SaveAdvantages: {
        Str: "",
        Dex: "",
        Int: "",
        Wis: "",
        ...updated?.SaveAdvantages
      }
    };
  };

  // Older saved data (and anything imported from a D&D-format source) has
  // Saves/Skills entries shaped { Name, Modifier: number }; the current
  // shape is { Name, Advantage: string }. There's no sound numeric-to-
  // advantage mapping (a "+5" bonus isn't equivalent to "advantage"), so
  // legacy entries are dropped rather than converted. Idempotent - entries
  // that already have Advantage pass through untouched.
  const dropLegacyModifierEntries = (entries: any): NameAndAdvantage[] => {
    if (!Array.isArray(entries)) {
      return [];
    }
    return entries.filter(entry => !("Modifier" in entry) || "Advantage" in entry);
  };

  export const IsPlayerCharacter = (statBlock: StatBlock): boolean =>
    statBlock.Player == "player";

  export const IsCompanion = (statBlock: StatBlock): boolean =>
    statBlock.Player == "companion";

  // A companion (e.g. a player's pet/sidekick) isn't a PC - it doesn't get
  // Wounds/Gold/Hit Dice, Level-vs-Challenge labeling, etc. - but it acts
  // alongside the party, not the monsters, for turn-order/phase purposes.
  export const ActsInPlayerPhase = (statBlock: StatBlock): boolean =>
    IsPlayerCharacter(statBlock) || IsCompanion(statBlock);

  // Same [Str]/[Dex]/[Int]/[Wis]/[Wil] convention TextEnricher resolves
  // inline in ability text (see TextEnricher.tsx's abilityFieldsByAlias) -
  // "Wil" is Nimble's display name for the Wis field.
  const ABILITY_COUNT_ALIASES: Record<string, keyof AbilityScores> = {
    str: "Str",
    dex: "Dex",
    int: "Int",
    wis: "Wis",
    wil: "Wis"
  };

  const PLAIN_COUNT_PATTERN = /^(\d+)$/;
  const ABILITY_COUNT_PATTERN = /^\[(Str|Dex|Int|Wis|Wil)\]$/i;
  const MULTIPLIED_ABILITY_COUNT_PATTERN =
    /^(\d+)\s*[×x]\s*\[(Str|Dex|Int|Wis|Wil)\]$/i;

  // Resolves a charge count expression - a plain number ("2"), a bare
  // ability modifier ("[Dex]"), or a multiplied modifier ("2×[Wil]") - to a
  // number. Ability-based expressions need the combatant's current
  // Abilities to resolve; without them (e.g. read from a compendium listing
  // with no combatant attached) they're left unresolved.
  const ParseChargeCount = (
    expression: string,
    abilities: AbilityScores | undefined
  ): number | null => {
    const plain = expression.match(PLAIN_COUNT_PATTERN);
    if (plain) {
      return parseInt(plain[1]);
    }
    if (!abilities) {
      return null;
    }
    const abilityOnly = expression.match(ABILITY_COUNT_PATTERN);
    if (abilityOnly) {
      return abilities[ABILITY_COUNT_ALIASES[abilityOnly[1].toLowerCase()]];
    }
    const multiplied = expression.match(MULTIPLIED_ABILITY_COUNT_PATTERN);
    if (multiplied) {
      const modifier = abilities[ABILITY_COUNT_ALIASES[multiplied[2].toLowerCase()]];
      return parseInt(multiplied[1]) * modifier;
    }
    return null;
  };

  const USAGE_PATTERN = /^\s*(.+?)\s*\/\s*(Safe Rest|Encounter)\s*$/i;

  // Recognizes the structured Usage conventions ("2/Safe Rest",
  // "1/Encounter", "[Dex]/Safe Rest", "2×[Wil]/Encounter") that unlock
  // charge tracking; anything else (prose, "Recharge 5-6", blank) is left
  // as a plain display label. Pass the combatant's Abilities to resolve an
  // ability-based count - without them, those forms fall back to null (same
  // as not matching) rather than showing a wrong/stale count.
  export const ParseChargeUsage = (
    usage: string | undefined,
    abilities?: AbilityScores
  ): ChargeUsage | null => {
    if (!usage) {
      return null;
    }
    const match = usage.match(USAGE_PATTERN);
    if (!match) {
      return null;
    }
    const max = ParseChargeCount(match[1], abilities);
    if (max === null) {
      return null;
    }
    const resetOn: ChargeResetTrigger =
      match[2].toLowerCase() === "encounter" ? "encounter" : "safe-rest";
    return { Max: Math.max(0, max), ResetOn: resetOn };
  };

  // Every ability list that can carry a charge-tracked power. Traits are
  // included even though they're rarely limited-use, since nothing stops an
  // author from putting "1/Safe Rest" there.
  export const AllPowers = (statBlock: StatBlock): NameAndContent[] => [
    ...statBlock.Traits,
    ...statBlock.Actions,
    ...(statBlock.BonusActions ?? []),
    ...statBlock.Reactions,
    ...statBlock.LegendaryActions,
    ...(statBlock.MythicActions ?? [])
  ];

  export const FindChargeUsage = (
    statBlock: StatBlock,
    abilityName: string
  ): ChargeUsage | null => {
    const power = AllPowers(statBlock).find(p => p.Name === abilityName);
    return power ? ParseChargeUsage(power.Usage, statBlock.Abilities) : null;
  };

  // Drops every charge entry whose ability currently resolves to the given
  // reset trigger - used when a Safe Rest is taken, or when the last
  // monster leaves the encounter. Entries for abilities no longer on the
  // stat block (renamed/removed since) are harmless leftovers and are left
  // alone, since they can't match any trigger.
  export const ClearAbilityCharges = (
    used: Record<string, number> | undefined,
    statBlock: StatBlock,
    trigger: ChargeResetTrigger
  ): Record<string, number> => {
    const current = used ?? {};
    if (Object.keys(current).length === 0) {
      return current;
    }
    const next = { ...current };
    let changed = false;
    for (const name of Object.keys(next)) {
      if (FindChargeUsage(statBlock, name)?.ResetOn === trigger) {
        delete next[name];
        changed = true;
      }
    }
    return changed ? next : current;
  };

  // Monsters can author their HP per Armor tier (it drops as armor
  // degrades); HP.Value itself may be a placeholder (even 0) when an
  // Armor tier is set, so any code reading a monster's starting HP must
  // go through this rather than statBlock.HP directly.
  export const ResolveArmorHP = (statBlock: StatBlock): ValueAndNotes => {
    if (!ActsInPlayerPhase(statBlock)) {
      if (statBlock.Armor === "medium" && statBlock.HPMediumArmor) {
        return statBlock.HPMediumArmor;
      }
      if (statBlock.Armor === "heavy" && statBlock.HPHeavyArmor) {
        return statBlock.HPHeavyArmor;
      }
    }
    return statBlock.HP;
  };

  export const IsLegendary = (statBlock: StatBlock): boolean =>
    statBlock.Player == "legendary";

  export const IsTitan = (statBlock: StatBlock): boolean =>
    statBlock.Player == "titan";

  export const Default = (): StatBlock => ({
    Id: probablyUniqueString(),
    Name: "",
    Path: "",
    Source: "",
    Type: "",
    Armor: "",
    HP: { Value: 1, Notes: "(1d1+0)" },
    AC: { Value: 0, Notes: "" },
    InitiativeModifier: 0,
    InitiativeAdvantage: false,
    Speed: [],
    Abilities: { Str: 0, Dex: 0, Int: 0, Wis: 0 },
    SaveAdvantages: { Str: "", Dex: "", Int: "", Wis: "" },
    DamageVulnerabilities: [],
    DamageResistances: [],
    DamageImmunities: [],
    ConditionImmunities: [],
    Saves: [],
    Skills: [],
    Senses: [],
    Languages: [],
    Challenge: "1",
    Traits: [],
    Actions: [],
    BonusActions: [],
    Reactions: [],
    LegendaryActions: [],
    MythicActions: [],
    Description: "",
    Player: "",
    Version: process.env.VERSION || "0.0.0",
    ImageURL: ""
  });
}
