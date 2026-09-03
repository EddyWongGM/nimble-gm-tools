import * as React from "react";

import { TagState } from "../../common/CombatantState";
import { Command } from "../Commands/Command";
import { Combatant } from "../Combatant/Combatant";

export const CommandContext = React.createContext({
  SelectCombatant: (combatantId: string, appendSelection: boolean) => {},
  RemoveTagFromCombatant: (combatantId: string, tagState: TagState) => {},
  ApplyDamageToCombatant: (combatantId: string) => {},
  ApplyManaToCombatant: (combatantId: string) => {},
  ApplyResourcesToCombatant: (combatantId: string) => {},
  ApplyHitDiceToCombatant: (combatantId: string) => {},
  ApplyWoundsToCombatant: (combatantId: string) => {},
  ApplyGoldToCombatant: (combatantId: string) => {},
  CycleArmorTierForCombatant: (combatantId: string) => {},
  AddItemToCombatant: (combatantId: string) => {},
  MoveCombatantFromDrag: (
    draggedCombatantId: string,
    droppedOntoCombatantId: string | null
  ) => {},
  SetCombatantColor: (combatantId: string, color: string) => {},
  ToggleCombatantSpentReaction: (combatantId: string) => {},
  ToggleCombatantHasTakenTurn: (combatantId: string) => {},
  ResetHasTakenTurnForAllCombatants: () => {},
  CombatantsPendingRemove: [] as Combatant[],
  RestoreCombatants: () => {},
  FlushCombatants: () => {},
  CombatantCommands: [] as Command[]
});
