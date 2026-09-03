import { DurationTiming } from "./DurationTiming";
import { StatBlock } from "./StatBlock";

export interface TagState {
  Text: string;
  DurationRemaining: number;
  DurationTiming: DurationTiming;
  DurationCombatantId: string;
  Hidden?: boolean;
}

export interface InventoryItem {
  Name: string;
  Stackable: boolean;
  Quantity: number;
  SlotCost: number;
}

export interface CombatantState {
  Id: string;
  StatBlock: StatBlock;
  PersistentCharacterId?: string;
  CurrentHP: number;
  CurrentMana?: number;
  TemporaryMana?: number;
  CurrentResources?: number;
  TemporaryResources?: number;
  CurrentHitDice?: number;
  TemporaryHitDice?: number;
  RevealedHitDice?: boolean;
  CurrentWounds?: number;
  TemporaryWounds?: number;
  CurrentGold?: number;
  CurrentNotes?: string;
  Color?: string;
  ReactionsSpent?: number;
  TemporaryHP: number;
  Initiative: number;
  InitiativeGroup?: string;
  Alias: string;
  IndexLabel: number | null;
  Tags: TagState[];
  Items?: InventoryItem[];
  Hidden: boolean;
  KeepHidden?: boolean;
  RevealedAC: boolean;
  HasTakenTurn?: boolean;
  HasEnteredLastStand?: boolean;
  RoundCounter?: number;
  ElapsedSeconds?: number;
  InterfaceVersion: string;
}
