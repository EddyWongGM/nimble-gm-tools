import { now } from "moment";
import { StatBlock } from "./StatBlock";
import { probablyUniqueString } from "./Toolbox";
import { InventoryItem, TagState } from "./CombatantState";

export interface PersistentCharacter {
  Id: string;
  Version: string;
  Name: string;
  Path: string;
  LastUpdateMs: number;
  CurrentHP: number;
  CurrentMana?: number;
  CurrentResources?: number;
  CurrentHitDice?: number;
  CurrentWounds?: number;
  CurrentGold?: number;
  StatBlock: StatBlock;
  Notes: string;
  Tags?: TagState[];
  Items?: InventoryItem[];
}

export namespace PersistentCharacter {
  export function Initialize(statBlock: StatBlock): PersistentCharacter {
    // Preload content (e.g. the Sample Heroes starter set) can carry a
    // starting Items array on its raw JSON even though Items isn't part of
    // the StatBlock type - pull it off here rather than dropping it.
    const { Items: startingItems, ...statBlockWithoutItems } = statBlock as {
      Items?: InventoryItem[];
    } & StatBlock;
    return {
      Id: statBlock.Id || probablyUniqueString(),
      Version: statBlock.Version,
      Name: statBlock.Name,
      Path: statBlock.Path,
      LastUpdateMs: now(),
      CurrentHP: statBlock.HP.Value,
      CurrentMana: statBlock.Mana?.Value,
      CurrentResources: statBlock.ResourcesStartEmpty
        ? 0
        : statBlock.Resources?.Value,
      CurrentHitDice: statBlock.HitDice?.Value,
      CurrentWounds: statBlock.Wounds ? 0 : undefined,
      CurrentGold: 0,
      StatBlock: statBlockWithoutItems,
      Notes: "",
      Tags: [],
      Items: startingItems ?? []
    };
  }

  export const Default = () =>
    Initialize({
      ...StatBlock.Default(),
      HitDice: { Value: 1, Notes: "" },
      Wounds: { Value: 5, Notes: "" }
    });

  export const Update = (character: any): PersistentCharacter => {
    if (!character?.StatBlock) {
      return character;
    }
    return { ...character, StatBlock: StatBlock.Update(character.StatBlock) };
  };

  export const GetSearchHint = (character: PersistentCharacter) =>
    character.StatBlock.Type;

  const GetTotalLevelFromString = (levelString: string) => {
    const matches = levelString.toString().match(/\d+/g);
    if (!matches) {
      return "";
    }

    return matches
      .reduce((total, digitMatch) => {
        const level = parseInt(digitMatch);
        if (!isNaN(level)) {
          return total + level;
        }
        return total;
      }, 0)
      .toString();
  };

  export const GetFilterDimensions = (character: PersistentCharacter) => ({
    Level: GetTotalLevelFromString(character.StatBlock.Challenge)
  });
}
