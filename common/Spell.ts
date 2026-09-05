import { Listable, FilterDimensions } from "./Listable";
import { probablyUniqueString } from "./Toolbox";

export type SpellDistanceType = "Range" | "Reach";

export type EquipmentRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "very rare"
  | "legendary";

export const EquipmentRarities: EquipmentRarity[] = [
  "common",
  "uncommon",
  "rare",
  "very rare",
  "legendary"
];

export interface Spell extends Listable {
  // Missing/undefined on data saved before EntryType existed - treat as "spell".
  EntryType?: "spell" | "rule" | "equipment";
  Source: string;
  Tier: number;
  School: string;
  Actions: number;
  DistanceType: SpellDistanceType;
  Distance: string;
  Components: string;
  Classes: string[];
  Description: string;
  CastCondition: string;
  Upcast: string;
  // Equipment-only fields, unused by spells/rules.
  Cost?: number;
  Rarity?: EquipmentRarity;
  Charges?: number;
  Recharge?: string;
}

export namespace Spell {
  export const GetSearchHint = (spell: Spell) =>
    [spell.Name, spell.School, ...spell.Classes].join(" ");

  export const GetFilterDimensions = (spell: Spell): FilterDimensions => ({
    // Falls back to the pre-rename `Level` key so this stays safe to call on
    // listables that haven't been through Update() yet - see Update() below.
    Tier: (spell.Tier ?? (spell as any).Level ?? 0).toString(),
    Type: spell.School,
    Category:
      spell.EntryType === "rule"
        ? "Rule"
        : spell.EntryType === "equipment"
          ? "Equipment"
          : "Spell",
    Rarity: spell.EntryType === "equipment" ? spell.Rarity : undefined
  });

  export const Default: () => Spell = () => {
    return {
      Id: probablyUniqueString(),
      Version: process.env.VERSION || "0.0.0",
      Name: "",
      Path: "",
      EntryType: "spell",
      Source: "",
      Actions: 0,
      Classes: [],
      Components: "",
      Description: "",
      Tier: 0,
      DistanceType: "Range",
      Distance: "",
      CastCondition: "",
      Upcast: "",
      School: "",
      Cost: 0,
      Rarity: "common",
      Recharge: ""
    };
  };

  // Older saved data has `Level` (renamed to `Tier`) and a free-text `Range`
  // string instead of `DistanceType`/`Distance`. Idempotent - already-migrated
  // data passes through untouched.
  export const Update = (spell: any): Spell => {
    let updated = spell;

    if (updated?.Tier === undefined && updated?.Level !== undefined) {
      const { Level, ...rest } = updated;
      updated = { ...rest, Tier: Level };
    }

    if (updated?.DistanceType === undefined) {
      const { Range, ...rest } = updated;
      updated = {
        ...rest,
        DistanceType: "Range",
        Distance: Range !== undefined ? Range : rest.Distance || ""
      };
    }

    if (updated?.Actions === undefined) {
      updated = { ...updated, Actions: 0 };
    }

    if (updated?.CastCondition === undefined) {
      updated = { ...updated, CastCondition: "" };
    }

    if (updated?.Upcast === undefined) {
      updated = { ...updated, Upcast: "" };
    }

    if (updated?.Cost === undefined) {
      updated = { ...updated, Cost: 0 };
    }

    if (updated?.Rarity === undefined) {
      updated = { ...updated, Rarity: "common" };
    }

    if (updated?.Recharge === undefined) {
      updated = { ...updated, Recharge: "" };
    }

    return updated;
  };
}
