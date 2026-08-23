import * as React from "react";
import {
  SavedScene,
  SCENE_LIBRARY_SOFT_CAP
} from "../../../common/PlayerViewSettings";
import { useSubscription } from "../../Combatant/linkComponentToObservables";
import { Button } from "../../Components/Button";
import { Folder } from "../Components/Folder";
import { CurrentSettings } from "../../Settings/Settings";

export interface SceneLibraryReferencePaneProps {
  applyScene: (imageUrl: string) => void;
  showScene: (scene: SavedScene) => void;
  dismissScene: () => void;
  activeSceneId: string | null;
  addScene: () => void;
  editScene: (scene: SavedScene) => void;
  deleteScene: (sceneId: string) => void;
  combatantsHidden: boolean;
  onToggleCombatantsHidden: () => void;
}

type SceneRowProps = Pick<
  SceneLibraryReferencePaneProps,
  "showScene" | "editScene" | "deleteScene" | "dismissScene" | "activeSceneId"
>;

type SceneFolder = {
  label: string;
  scenes: SavedScene[];
  subFoldersByKey: Record<string, SceneFolder>;
};

const byName = (a: SavedScene, b: SavedScene) =>
  a.Name.toLocaleLowerCase().localeCompare(b.Name.toLocaleLowerCase());

const byLabel = (a: string, b: string) =>
  a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase());

/**
 * Groups scenes by their (optional, DM-typed) Path, splitting on "/" so a
 * Path like "Tomb of Annihilation/LV 2 Cellar" nests two folders deep -
 * mirroring how the Encounters/StatBlocks libraries treat Path, without
 * pulling in their Listing<T>-based folder tree (rename, drag-move) that
 * Scenes deliberately don't have. There's no manual reordering either, so
 * each level (root, and within each folder) is sorted alphabetically by
 * Name rather than left in add-order.
 */
function groupScenesByFolder(scenes: SavedScene[]): {
  rootScenes: SavedScene[];
  foldersByKey: Record<string, SceneFolder>;
} {
  const rootScenes: SavedScene[] = [];
  const foldersByKey: Record<string, SceneFolder> = {};

  for (const scene of scenes) {
    const segments = (scene.Path ?? "").split("/").map(s => s.trim()).filter(Boolean);
    if (segments.length === 0) {
      rootScenes.push(scene);
      continue;
    }

    let cursor = foldersByKey;
    let folder: SceneFolder;
    for (const segment of segments) {
      folder = cursor[segment] ??= {
        label: segment,
        scenes: [],
        subFoldersByKey: {}
      };
      cursor = folder.subFoldersByKey;
    }
    folder.scenes.push(scene);
  }

  rootScenes.sort(byName);
  sortFoldersRecursively(foldersByKey);

  return { rootScenes, foldersByKey };
}

function sortFoldersRecursively(foldersByKey: Record<string, SceneFolder>) {
  for (const folder of Object.values(foldersByKey)) {
    folder.scenes.sort(byName);
    sortFoldersRecursively(folder.subFoldersByKey);
  }
}

function renderSceneFolders(
  foldersByKey: Record<string, SceneFolder>,
  parentPath: string,
  callbacks: SceneRowProps
): JSX.Element[] {
  return Object.keys(foldersByKey)
    .sort(byLabel)
    .map(key => {
      const folder = foldersByKey[key];
      const path = parentPath ? `${parentPath}/${key}` : key;
      return (
        <Folder key={key} name={folder.label} path={path}>
          {renderSceneFolders(folder.subFoldersByKey, path, callbacks)}
          {folder.scenes.map(scene => (
            <SceneRow key={scene.Id} scene={scene} {...callbacks} />
          ))}
        </Folder>
      );
    });
}

export function SceneLibraryReferencePane(
  props: SceneLibraryReferencePaneProps
) {
  const settings = useSubscription(CurrentSettings);
  const scenes = settings.PlayerView.SceneLibrary;
  const { rootScenes, foldersByKey } = groupScenesByFolder(scenes);
  const rowCallbacks: SceneRowProps = {
    showScene: props.showScene,
    editScene: props.editScene,
    deleteScene: props.deleteScene,
    dismissScene: props.dismissScene,
    activeSceneId: props.activeSceneId
  };

  return (
    <div className="library c-scene-library">
      <div className="c-scene-library__controls">
        <Button
          text={
            props.combatantsHidden ? "Show Combatants" : "Hide Combatants"
          }
          fontAwesomeIcon="eye-slash"
          tooltip="Toggle whether the combatant list covers the Player View background"
          onClick={props.onToggleCombatantsHidden}
        />
        <Button
          text="Clear Background"
          fontAwesomeIcon="eraser"
          tooltip="Remove the current Player View background image"
          onClick={() => props.applyScene("")}
        />
      </div>
      <ul className="listings zebra-stripe">
        {scenes.length === 0 && (
          <li className="c-scene-library__empty">
            No scenes saved yet. Add a scene to switch the Player View
            background with one click during a session.
          </li>
        )}
        {renderSceneFolders(foldersByKey, "", rowCallbacks)}
        {rootScenes.map(scene => (
          <SceneRow key={scene.Id} scene={scene} {...rowCallbacks} />
        ))}
      </ul>
      {scenes.length >= SCENE_LIBRARY_SOFT_CAP && (
        <p className="c-scene-library__warning">
          {`You have ${scenes.length} saved scenes. Consider deleting ones you no longer need to keep this list easy to browse.`}
        </p>
      )}
      <div className="buttons">
        <Button
          text="Add Scene"
          additionalClassNames="new"
          fontAwesomeIcon="plus"
          onClick={props.addScene}
        />
      </div>
    </div>
  );
}

function SceneRow(props: { scene: SavedScene } & SceneRowProps) {
  const { scene } = props;
  return (
    <li className="c-scene-library__scene">
      <button
        type="button"
        className="c-scene-library__apply-button"
        onClick={() => props.showScene(scene)}
        title={`Reveal "${scene.Name}" and hide combatants`}
      >
        <img
          className="c-scene-library__thumbnail"
          src={scene.ImageUrl}
          alt={scene.Name}
        />
        <span className="c-scene-library__name">{scene.Name}</span>
      </button>
      {props.activeSceneId === scene.Id && (
        <Button
          fontAwesomeIcon="times"
          tooltip="Dismiss Scene"
          onClick={props.dismissScene}
        />
      )}
      <Button
        fontAwesomeIcon="pencil-alt"
        tooltip="Edit Scene"
        onClick={() => props.editScene(scene)}
      />
      <Button
        fontAwesomeIcon="trash"
        tooltip="Delete Scene"
        onClick={() => {
          if (confirm(`Delete scene "${scene.Name}"?`)) {
            props.deleteScene(scene.Id);
          }
        }}
      />
    </li>
  );
}
