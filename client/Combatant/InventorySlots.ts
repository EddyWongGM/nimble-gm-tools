import { InventoryItem } from "../../common/CombatantState";
import { StatBlock } from "../../common/StatBlock";

const BaseInventorySlots = 10;

export function GetMaxInventorySlots(statBlock: StatBlock): number {
  return BaseInventorySlots + statBlock.Abilities.Str;
}

export function GetInventorySlotsUsed(items: InventoryItem[]): number {
  return items.reduce((total, item) => total + item.SlotCost, 0);
}
