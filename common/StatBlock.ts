import * as _ from "lodash";

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

export interface NameAndModifier {
  Name: string;
  Modifier: number;
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

export interface StatBlock extends Listable {
  Source: string;
  Type: string;
  HP: ValueAndNotes;
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
  Saves: NameAndModifier[];
  Skills: NameAndModifier[];
  Senses: string[];
  Languages: string[];
  Challenge: string;
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

  const BaseTypes = [
    "aberration",
    "beast",
    "celestial",
    "construct",
    "dragon",
    "elemental",
    "fey",
    "fiend",
    "giant",
    "humanoid",
    "monstrosity",
    "ooze",
    "plant",
    "undead"
  ];

  export const GetSearchHint = (statBlock: StatBlock): string =>
    statBlock.Type.toLocaleLowerCase().replace(/[^\w\s]/g, "");

  export const FilterDimensions = (statBlock: StatBlock): FilterDimensions => {
    const baseType = _.find(BaseTypes, t => statBlock.Type.search(t) != -1);
    return {
      Level: statBlock.Challenge,
      Source: statBlock.Source,
      Type: _.startCase(baseType)
    };
  };

  // Older saved data (and anything imported from a D&D-format source) still
  // has raw D&D ability scores (3-20) and a Con/Cha pair. Con/Cha's presence
  // is the shape marker - the new shape simply never has those keys - so
  // detecting it doesn't depend on guessing a numeric range. Idempotent and
  // safe to call on already-migrated data.
  export const Update = (statBlock: any): StatBlock => {
    const abilities = statBlock?.Abilities;
    if (!abilities || !("Con" in abilities || "Cha" in abilities)) {
      return statBlock;
    }

    return {
      ...statBlock,
      Abilities: {
        Str: GetModifierFromScore(abilities.Str),
        Dex: GetModifierFromScore(abilities.Dex),
        Int: GetModifierFromScore(abilities.Int),
        Wis: GetModifierFromScore(abilities.Wis)
      }
    };
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

  export const Default = (): StatBlock => ({
    Id: probablyUniqueString(),
    Name: "",
    Path: "",
    Source: "",
    Type: "",
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
