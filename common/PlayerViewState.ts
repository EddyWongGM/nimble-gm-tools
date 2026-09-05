import { CombatStats } from "./CombatStats";
import { EncounterState } from "./EncounterState";
import { InventoryDisplayPayload } from "./InventoryDisplay";
import { PlayerViewCombatantState } from "./PlayerViewCombatantState";
import { PlayerViewSettings } from "./PlayerViewSettings";

export interface PlayerViewState {
  encounterState: EncounterState<PlayerViewCombatantState> | null;
  settings: PlayerViewSettings | null;
  combatStats?: CombatStats | null;
  inventoryDisplay?: InventoryDisplayPayload | null;
  /**
   * Whether the GM who owns this encounter has Epic Tier - NOT the current
   * viewer's own session (players view this page logged out, so their own
   * env.HasEpicInitiative is always false and unrelated to the GM's tier).
   * Set server-side from the GM's authoritative socket session whenever
   * they push an update (see server/sockets.ts), not derived client-side.
   * Used to gate stat color customization (plans/private/COLOR_CUSTOMIZATION.md)
   * on Player View.
   */
  hasEpicInitiative?: boolean;
}
