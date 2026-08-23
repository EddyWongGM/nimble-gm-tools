import * as React from "react";

import { SavedScene } from "../../common/PlayerViewSettings";
import { SubmitButton } from "../Components/Button";
import { PromptProps } from "./PendingPrompts";

export function ScenePrompt(
  scene: SavedScene
): PromptProps<Record<string, never>> {
  return {
    autoFocusSelector: "button",
    children: <ScenePromptComponent scene={scene} />,
    initialValues: {},
    onSubmit: () => true
  };
}

function ScenePromptComponent(props: {
  scene: SavedScene;
}): React.ReactElement {
  return (
    <div className="prompt-scene">
      <div className="scene">
        <h3>{props.scene.Name}</h3>
        <img
          className="prompt-scene__image"
          src={props.scene.ImageUrl}
          alt={props.scene.Name}
        />
      </div>
      <SubmitButton tooltip="Dismiss Scene" />
    </div>
  );
}
