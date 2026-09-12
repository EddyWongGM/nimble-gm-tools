import * as React from "react";

import { Combatant } from "../Combatant/Combatant";
import { SubmitButton } from "../Components/Button";
import { TextEnricherContext } from "../TextEnricher/TextEnricher";
import { PromptProps } from "./PendingPrompts";

function RoomInfoPromptComponent(props: {
  name: string;
  description: string;
  notes: string;
}) {
  const textEnricher = React.useContext(TextEnricherContext);

  return (
    <div className="prompt-room-info">
      <div className="room-info">
        <h3>{props.name}</h3>
        {props.description ? (
          <div className="room-info__description">
            {textEnricher.EnrichText(props.description)}
          </div>
        ) : null}
        {props.notes ? (
          <div className="room-info__notes">
            <strong>GM Notes</strong>
            {textEnricher.EnrichText(props.notes)}
          </div>
        ) : null}
        {!props.description && !props.notes ? (
          <p className="room-info__empty">No description or notes yet.</p>
        ) : null}
      </div>
      <SubmitButton />
    </div>
  );
}

export function RoomInfoPrompt(
  combatant: Combatant
): PromptProps<Record<string, never>> {
  return {
    autoFocusSelector: "button",
    initialValues: {},
    onSubmit: () => true,
    hideCancelButton: true,
    children: (
      <RoomInfoPromptComponent
        name={combatant.DisplayName()}
        description={combatant.StatBlock().Description}
        notes={combatant.CurrentNotes()}
      />
    )
  };
}
