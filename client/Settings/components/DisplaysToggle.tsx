import * as React from "react";
import { ToggleButton } from "./Toggle";
import { Info } from "../../Components/Info";
import { env } from "../../Environment";

export function DisplaysToggle(props: {
  children: React.ReactNode;
  fieldName?: string;
  encounterViewFieldName?: string;
  playerViewFieldName?: string;
  requireEpicTierForPlayerViewToggle?: boolean;
  /** playerViewFieldName is a "Hide" field; show/toggle it as "Show" (checked = visible in Player View). */
  invertPlayerView?: boolean;
}) {
  const encounterViewFieldName =
    props.encounterViewFieldName ?? `TrackerView.${props.fieldName}`;
  const playerViewFieldName =
    props.playerViewFieldName ?? `PlayerView.${props.fieldName}`;

  const fieldEncounterViewId = `toggle_${encounterViewFieldName}`;
  const fieldPlayerViewId = `toggle_${playerViewFieldName}`;

  const showEpicTierNotice =
    props.requireEpicTierForPlayerViewToggle && !env.HasEpicInitiative;

  const epicTierNotice = showEpicTierNotice && (
    <Info>This feature is available for Epic Tier subscribers.</Info>
  );

  return (
    <div className="c-display-toggles">
      <div className="c-display-toggles__label">{props.children}</div>
      <div className="c-display-toggles__toggle">
        <ToggleButton
          fieldName={encounterViewFieldName}
          id={fieldEncounterViewId}
        />
      </div>
      <div className="c-display-toggles__toggle">
        {epicTierNotice || (
          <ToggleButton
            fieldName={playerViewFieldName}
            id={fieldPlayerViewId}
            inverted={props.invertPlayerView}
          />
        )}
      </div>
    </div>
  );
}

export function DisplaysToggleHeader() {
  return (
    <div className="c-display-toggles">
      <div className="c-display-toggles__headertext">
        <h3>Display</h3>
      </div>
      <div className="c-display-toggles--header__label">Encounter View</div>
      <div className="c-display-toggles--header__label">Player View</div>
    </div>
  );
}
