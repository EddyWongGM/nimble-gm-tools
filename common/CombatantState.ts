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
  // Charges spent on abilities with a "N/Safe Rest" or "N/Encounter" Usage,
  // keyed by ability Name. Absence means 0 used; see StatBlock.ParseChargeUsage.
  AbilityChargesUsed?: Record<string, number>;
  Hidden: boolean;
  KeepHidden?: boolean;
  RevealedAC: boolean;
  HasTakenTurn?: boolean;
  HasEnteredLastStand?: boolean;
  RoundCounter?: number;
  ElapsedSeconds?: number;
  InterfaceVersion: string;
  // The hero count a hero-count-scaled monster's HP was last scaled for
  // (Legendary, or a Normal monster with ScalesWithHeroCount) - lets a
  // saved encounter's combatant be rescaled to the current party size when
  // reloaded, by dividing out this multiplier to recover its base HP.
  ScaledHeroCount?: number;
}
