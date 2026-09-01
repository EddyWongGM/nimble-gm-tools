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

export type InitiativeSpecialRoll = "advantage" | "disadvantage" | "take-ten";

export type ArmorTier = "" | "medium" | "heavy";

export interface StatBlock extends Listable {
  Source: string;
  Type: string;
  Armor?: ArmorTier;
  HP: ValueAndNotes;
  HPMediumArmor?: ValueAndNotes;
  HPHeavyArmor?: ValueAndNotes;
  LastStageHP?: ValueAndNotes;
  AC: ValueAndNotes;
  Mana?: ValueAndNotes;
  Resources?: ValueAndNotes;
  HitDice?: ValueAndNotes;
  Wounds?: ValueAndNotes;
  Speed: string[];
  Abilities: AbilityScores;
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
      Type: statBlock.Type.trim()
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

    return {
      ...updated,
      Saves: dropLegacyModifierEntries(updated?.Saves),
      Skills: dropLegacyModifierEntries(updated?.Skills)
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

  export const IsLegendary = (statBlock: StatBlock): boolean =>
    statBlock.Player == "legendary";

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
