import * as React from "react";

import { CombatantState } from "../../common/CombatantState";
import { EncounterState } from "../../common/EncounterState";
import { StatBlock } from "../../common/StatBlock";
import { Button } from "../Components/Button";
import { CombatantRow } from "./CombatantRow";
import { CommandContext } from "./CommandContext";
import { InitiativeListHeader } from "./InitiativeListHeader";
import { RestoreCombatants } from "./RestoreCombatants";
import { SettingsContext } from "../Settings/SettingsContext";

export function InitiativeList(props: {
  encounterState: EncounterState<CombatantState>;
  selectedCombatantIds: string[];
  combatantCountsByName: { [name: string]: number };
}) {
  const commandContext = React.useContext(CommandContext);
  const settings = React.useContext(SettingsContext);
  const alwaysNumberMonsters = settings.Rules.AlwaysNumberMonsters;
  const encounterState = props.encounterState;
  const showManaColumn =
    settings.Rules.EnableMana &&
    encounterState.Combatants.some(c => c.StatBlock.Mana);
  const showResourcesColumn =
    settings.Rules.EnableResources &&
    encounterState.Combatants.some(c => c.StatBlock.Resources);
  const showHitDiceColumn =
    settings.Rules.EnableHitDice &&
    encounterState.Combatants.some(c => c.StatBlock.HitDice);
  const showWoundsColumn = encounterState.Combatants.some(
    c => c.StatBlock.Wounds && StatBlock.ActsInPlayerPhase(c.StatBlock)
  );
  const showItemsColumn =
    settings.Rules.EnableInventory &&
    encounterState.Combatants.some(c => StatBlock.IsPlayerCharacter(c.StatBlock));
  const showGoldColumn =
    settings.Rules.EnableGold &&
    encounterState.Combatants.some(c => StatBlock.IsPlayerCharacter(c.StatBlock));
  const anyHasTakenTurn = encounterState.Combatants.some(c => c.HasTakenTurn);

  return (
    <div className="initiative-list">
      <div className="initiative-list__header">
        <h2>Nimble RPG App</h2>
        {encounterState.MonstersActFirst && (
          <span className="initiative-list__phase-indicator">
            Monsters act first
          </span>
        )}
        {anyHasTakenTurn && (
          <Button
            text="Reset Turns"
            tooltip="Uncheck 'has taken turn' for everyone"
            onClick={commandContext.ResetHasTakenTurnForAllCombatants}
            additionalClassNames="c-button--reset-turns"
          />
        )}
      </div>
      <table className="combatants">
        <InitiativeListHeader
          showManaColumn={showManaColumn}
          showResourcesColumn={showResourcesColumn}
          showHitDiceColumn={showHitDiceColumn}
          showWoundsColumn={showWoundsColumn}
          showItemsColumn={showItemsColumn}
          showGoldColumn={showGoldColumn}
        />
        <tbody>
          {encounterState.Combatants.map((combatantState, index) => {
            const siblingCount =
              props.combatantCountsByName[combatantState.StatBlock.Name] || 1;
            const isMonster = !StatBlock.ActsInPlayerPhase(
              combatantState.StatBlock
            );
            const isLegendary = StatBlock.IsLegendary(combatantState.StatBlock);

            return (
              <CombatantRow
                key={combatantState.Id}
                combatantState={combatantState}
                isActive={encounterState.ActiveCombatantId == combatantState.Id}
                isSelected={props.selectedCombatantIds.some(
                  id => id == combatantState.Id
                )}
                // Show index labels if the encounter has ever had more than one
                // creature with this name, or if Creatures and NPCs are always
                // numbered per settings. Legendary monsters are exempt from the
                // settings-driven numbering - they're solo/unique by design -
                // but still get numbered if a GM genuinely duplicates one.
                showIndexLabel={
                  siblingCount > 1 ||
                  (alwaysNumberMonsters && isMonster && !isLegendary)
                }
                initiativeIndex={index}
                showManaColumn={showManaColumn}
                showResourcesColumn={showResourcesColumn}
                showHitDiceColumn={showHitDiceColumn}
                showWoundsColumn={showWoundsColumn}
                showItemsColumn={showItemsColumn}
                showGoldColumn={showGoldColumn}
              />
            );
          })}
        </tbody>
      </table>
      <RestoreCombatants />
    </div>
  );
}
