import * as React from "react";
import { TrackerViewModel } from "../TrackerViewModel";
import { useSubscription } from "../Combatant/linkComponentToObservables";
import { LibraryReferencePanes } from "../Library/ReferencePane/LibraryReferencePanes";
import { useVerticalResizerDrop } from "./VerticalResizer";

export function LeftColumn(props: {
  tracker: TrackerViewModel;
  columnWidth: number;
}): JSX.Element {
  const combatantsHidden = useSubscription(
    props.tracker.Encounter.CombatantsHidden
  );
  const activeSceneId = useSubscription(
    props.tracker.EncounterCommander.ActiveSceneId
  );

  return (
    <div
      className="left-column"
      style={{ width: props.columnWidth, maxWidth: props.columnWidth }}
      ref={useVerticalResizerDrop()}
    >
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
    </div>
  );
}
