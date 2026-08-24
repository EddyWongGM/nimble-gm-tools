import * as React from "react";
import { TrackerViewModel } from "../TrackerViewModel";
import { useSubscription } from "../Combatant/linkComponentToObservables";
import { LibraryReferencePanes } from "../Library/ReferencePane/LibraryReferencePanes";
import { find } from "lodash";
import { CombatantDetails } from "../Combatant/CombatantDetails";
import { useVerticalResizerDrop } from "./VerticalResizer";
import { CombatantViewModel } from "../Combatant/CombatantViewModel";
import { Combatant } from "../Combatant/Combatant";
import { InventoryItem } from "../../common/CombatantState";

export function LeftColumn(props: {
  tracker: TrackerViewModel;
  columnWidth: number;
}): JSX.Element {
  const librariesVisible = useSubscription(props.tracker.LibrariesVisible);
  const combatantsHidden = useSubscription(
    props.tracker.Encounter.CombatantsHidden
  );
  const activeSceneId = useSubscription(
    props.tracker.EncounterCommander.ActiveSceneId
  );

  const combatantViewModels = useSubscription(
    props.tracker.CombatantViewModels
  );
  const activeCombatant = useSubscription(
    props.tracker.Encounter.EncounterFlow.ActiveCombatant
  );

  const activeCombatantViewModel = find(
    combatantViewModels,
    c => c.Combatant == activeCombatant
  );

  return (
    <div
      className="left-column"
      style={{ width: props.columnWidth, maxWidth: props.columnWidth }}
      ref={useVerticalResizerDrop()}
    >
      {librariesVisible && (
        <LibraryReferencePanes
          librariesCommander={props.tracker.LibrariesCommander}
          libraries={props.tracker.Libraries}
          applyScene={props.tracker.EncounterCommander.ApplyScene}
          showScene={props.tracker.EncounterCommander.ShowScene}
          dismissScene={props.tracker.EncounterCommander.DismissScene}
          activeSceneId={activeSceneId}
          combatantsHidden={combatantsHidden}
          onToggleCombatantsHidden={
            props.tracker.EncounterCommander.ToggleCombatantsHiddenInPlayerView
          }
        />
      )}
      {librariesVisible || (
        <ActiveCombatant
          activeCombatantViewModel={activeCombatantViewModel}
          onRemoveItem={props.tracker.CombatantCommander.PromptRemoveItem}
          onShowInventoryCard={props.tracker.CombatantCommander.ShowInventoryCard}
        />
      )}
    </div>
  );
}

function ActiveCombatant(props: {
  activeCombatantViewModel: CombatantViewModel;
  onRemoveItem: (combatant: Combatant, item: InventoryItem) => void;
  onShowInventoryCard: (combatant: Combatant) => void;
}) {
  return (
    <div className="active-combatant">
      <div className="combatant-details__header">
        <h2>Active Name</h2>
      </div>
      {props.activeCombatantViewModel && (
        <CombatantDetails
          combatantViewModel={props.activeCombatantViewModel}
          displayMode="active"
          key={props.activeCombatantViewModel.Combatant.Id}
          onRemoveItem={props.onRemoveItem}
          onShowInventoryCard={props.onShowInventoryCard}
        />
      )}
      {!props.activeCombatantViewModel && (
        <p className="start-encounter-hint">
          Click [<span className="fas fa-play" /> Start Encounter ] to roll
          initiative. The StatBlock for the Active Name will be displayed
          here.
        </p>
      )}
    </div>
  );
}
