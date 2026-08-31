import { Listable, FilterDimensions } from "./Listable";
import { probablyUniqueString } from "./Toolbox";

export type SpellDistanceType = "Range" | "Reach";

export interface Spell extends Listable {
  // Missing/undefined on data saved before EntryType existed - treat as "spell".
  EntryType?: "spell" | "rule";
  Source: string;
  Tier: number;
  School: string;
  CastingTime: string;
  DistanceType: SpellDistanceType;
  Distance: string;
  Mana: number;
  Components: string;
  Duration: string;
  Classes: string[];
  Description: string;
  Ritual: boolean;
}

export namespace Spell {
  export const GetSearchHint = (spell: Spell) =>
    [spell.Name, spell.School, ...spell.Classes].join(" ");

  export const GetFilterDimensions = (spell: Spell): FilterDimensions => ({
    // Falls back to the pre-rename `Level` key so this stays safe to call on
    // listables that haven't been through Update() yet - see Update() below.
    Tier: (spell.Tier ?? (spell as any).Level ?? 0).toString(),
    Type: spell.School,
    Category: spell.EntryType === "rule" ? "Rule" : "Spell"
  });

  export const Default: () => Spell = () => {
    return {
      Id: probablyUniqueString(),
      Version: process.env.VERSION || "0.0.0",
      Name: "",
      Path: "",
      EntryType: "spell",
      Source: "",
      CastingTime: "",
      Classes: [],
      Components: "",
      Description: "",
      Duration: "",
      Tier: 0,
      DistanceType: "Range",
      Distance: "",
      Mana: 0,
      Ritual: false,
      School: ""
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

    if (updated?.Mana === undefined) {
      updated = { ...updated, Mana: 0 };
    }

    return updated;
  };
}
