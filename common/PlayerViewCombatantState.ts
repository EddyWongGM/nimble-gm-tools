import { TagState } from "./CombatantState";

export interface PlayerViewAbilityCharge {
  Name: string;
  Used: number;
  Max: number;
}

export interface PlayerViewCombatantState {
  Name: string;
  IndexLabel?: number;
  HPDisplay: string;
  HPColor: string;
  ManaDisplay?: string;
  ManaColor?: string;
  ResourcesDisplay?: string;
  ResourcesColor?: string;
  HitDiceDisplay?: string;
  HitDiceColor?: string;
  WoundsDisplay?: string;
  WoundsColor?: string;
  GoldDisplay?: string;
  GoldColor?: string;
  InventoryDisplay?: string;
  InventoryColor?: string;
  Initiative: number;
  Id: string;
  Tags: TagState[];
  IsPlayerCharacter: boolean;
  IsCompanion: boolean;
  IsLegendary: boolean;
  IsTitan: boolean;
  ImageURL: string;
  AC?: number;
  Color?: string;
  ReactionsSpent?: number;
  HasTakenTurn?: boolean;
  AbilityCharges?: PlayerViewAbilityCharge[];
}
