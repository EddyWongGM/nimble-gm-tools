import { fireEvent, render } from "@testing-library/react";
import * as React from "react";

import { SavedScene, SCENE_LIBRARY_SOFT_CAP } from "../../../common/PlayerViewSettings";
import { InitializeTestSettings } from "../../test/InitializeTestSettings";
import {
  SceneLibraryReferencePane,
  SceneLibraryReferencePaneProps
} from "./SceneLibraryReferencePane";

function makeScenes(count: number): SavedScene[] {
  return Array.from({ length: count }, (_, i) => ({
    Id: `scene-${i}`,
    Name: `Scene ${i}`,
    ImageUrl: `http://example.com/scene-${i}.png`
  }));
}

describe("SceneLibraryReferencePane", () => {
  let applyScene: jest.Mock;
  let showScene: jest.Mock;
  let dismissScene: jest.Mock;
  let addScene: jest.Mock;
  let editScene: jest.Mock;
  let deleteScene: jest.Mock;
  let onToggleCombatantsHidden: jest.Mock;

  beforeEach(() => {
    applyScene = jest.fn();
    showScene = jest.fn();
    dismissScene = jest.fn();
    addScene = jest.fn();
    editScene = jest.fn();
    deleteScene = jest.fn();
    onToggleCombatantsHidden = jest.fn();
  });

  function renderPane(overrides?: Partial<SceneLibraryReferencePaneProps>) {
    return render(
      <SceneLibraryReferencePane
        applyScene={applyScene}
        showScene={showScene}
        dismissScene={dismissScene}
        activeSceneId={null}
        addScene={addScene}
        editScene={editScene}
        deleteScene={deleteScene}
        combatantsHidden={false}
        onToggleCombatantsHidden={onToggleCombatantsHidden}
        {...overrides}
      />
    );
  }

  test("shows an empty-state message when no scenes are saved", () => {
    InitializeTestSettings({ PlayerView: { SceneLibrary: [] } });

    const view = renderPane();

    expect(view.getByText(/No scenes saved yet/)).toBeTruthy();
  });

  test("renders saved scenes by name", () => {
    InitializeTestSettings({ PlayerView: { SceneLibrary: makeScenes(2) } });

    const view = renderPane();

    expect(view.getByText("Scene 0")).toBeTruthy();
    expect(view.getByText("Scene 1")).toBeTruthy();
  });

  test("clicking a scene calls showScene with it", () => {
    InitializeTestSettings({ PlayerView: { SceneLibrary: makeScenes(1) } });

    const view = renderPane();

    fireEvent.click(
      view.getByTitle('Reveal "Scene 0" and hide combatants')
    );

    expect(showScene).toHaveBeenCalledWith(makeScenes(1)[0]);
  });

  test("clicking Add Scene invokes the addScene callback", () => {
    InitializeTestSettings({ PlayerView: { SceneLibrary: [] } });

    const view = renderPane();

    fireEvent.click(view.getByText("Add Scene"));

    expect(addScene).toHaveBeenCalled();
  });

  test("deleting a scene asks for confirmation and calls deleteScene when confirmed", () => {
    InitializeTestSettings({ PlayerView: { SceneLibrary: makeScenes(1) } });
    window.confirm = jest.fn(() => true);

    const view = renderPane();

    fireEvent.click(view.container.querySelector(".fa-trash").closest("button"));

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteScene).toHaveBeenCalledWith("scene-0");
  });

  test("deleting a scene does not call deleteScene when confirmation is declined", () => {
    InitializeTestSettings({ PlayerView: { SceneLibrary: makeScenes(1) } });
    window.confirm = jest.fn(() => false);

    const view = renderPane();

    fireEvent.click(view.container.querySelector(".fa-trash").closest("button"));

    expect(deleteScene).not.toHaveBeenCalled();
  });

  test("clicking edit invokes the editScene callback with the scene", () => {
    InitializeTestSettings({ PlayerView: { SceneLibrary: makeScenes(1) } });

    const view = renderPane();

    fireEvent.click(
      view.container.querySelector(".fa-pencil-alt").closest("button")
    );

    expect(editScene).toHaveBeenCalledWith(makeScenes(1)[0]);
  });

  test("does not show the soft-cap warning below the threshold", () => {
    InitializeTestSettings({
      PlayerView: { SceneLibrary: makeScenes(SCENE_LIBRARY_SOFT_CAP - 1) }
    });

    const view = renderPane();

    expect(view.queryByText(/saved scenes/)).toBeFalsy();
  });

  test("shows a soft-cap warning at the threshold", () => {
    InitializeTestSettings({
      PlayerView: { SceneLibrary: makeScenes(SCENE_LIBRARY_SOFT_CAP) }
    });

    const view = renderPane();

    expect(view.getByText(/saved scenes/)).toBeTruthy();
  });

  test("Clear Background calls applyScene with an empty URL", () => {
    InitializeTestSettings({ PlayerView: { SceneLibrary: [] } });

    const view = renderPane();

    fireEvent.click(view.getByText("Clear Background"));

    expect(applyScene).toHaveBeenCalledWith("");
  });

  test("shows Hide Combatants and calls the toggle when combatants are visible", () => {
    InitializeTestSettings({ PlayerView: { SceneLibrary: [] } });

    const view = renderPane({ combatantsHidden: false });

    fireEvent.click(view.getByText("Hide Combatants"));

    expect(onToggleCombatantsHidden).toHaveBeenCalled();
  });

  test("shows Show Combatants when combatants are already hidden", () => {
    InitializeTestSettings({ PlayerView: { SceneLibrary: [] } });

    const view = renderPane({ combatantsHidden: true });

    expect(view.getByText("Show Combatants")).toBeTruthy();
    expect(view.queryByText("Hide Combatants")).toBeFalsy();
  });

  describe("Dismiss Scene", () => {
    test("does not show a Dismiss Scene button when no scene is active", () => {
      InitializeTestSettings({ PlayerView: { SceneLibrary: makeScenes(1) } });

      const view = renderPane({ activeSceneId: null });

      expect(view.container.querySelector(".fa-times")).toBeFalsy();
    });

    test("shows a Dismiss Scene button only on the active scene's row, before Edit and Delete", () => {
      InitializeTestSettings({ PlayerView: { SceneLibrary: makeScenes(2) } });

      const view = renderPane({ activeSceneId: "scene-0" });

      const row = view.getByText("Scene 0").closest("li");
      const buttons = Array.from(row.querySelectorAll("button"));
      const iconClasses = buttons.map(
        b => b.querySelector("span")?.className || ""
      );

      expect(iconClasses.some(c => c.includes("fa-times"))).toBe(true);
      const dismissIndex = iconClasses.findIndex(c => c.includes("fa-times"));
      const editIndex = iconClasses.findIndex(c =>
        c.includes("fa-pencil-alt")
      );
      expect(dismissIndex).toBeLessThan(editIndex);

      const otherRow = view.getByText("Scene 1").closest("li");
      expect(otherRow.querySelector(".fa-times")).toBeFalsy();
    });

    test("clicking Dismiss Scene calls dismissScene", () => {
      InitializeTestSettings({ PlayerView: { SceneLibrary: makeScenes(1) } });

      const view = renderPane({ activeSceneId: "scene-0" });

      fireEvent.click(view.container.querySelector(".fa-times").closest("button"));

      expect(dismissScene).toHaveBeenCalled();
    });
  });

  describe("folder grouping", () => {
    test("a scene with no Path renders at the root, not inside a folder", () => {
      InitializeTestSettings({ PlayerView: { SceneLibrary: makeScenes(1) } });

      const view = renderPane();

      expect(view.getByText("Scene 0")).toBeTruthy();
    });

    test("a scene with a Path is grouped under a closed folder and hidden until expanded", () => {
      const scene: SavedScene = {
        Id: "scene-0",
        Name: "Cellar Entrance",
        ImageUrl: "http://example.com/cellar.png",
        Path: "Tomb of Annihilation"
      };
      InitializeTestSettings({ PlayerView: { SceneLibrary: [scene] } });

      const view = renderPane();

      expect(view.getByText("Tomb of Annihilation")).toBeTruthy();
      expect(view.queryByText("Cellar Entrance")).toBeFalsy();

      fireEvent.click(view.getByText("Tomb of Annihilation"));

      expect(view.getByText("Cellar Entrance")).toBeTruthy();
    });

    test("a slash-delimited Path nests folders", () => {
      const scene: SavedScene = {
        Id: "scene-0",
        Name: "Cellar Entrance",
        ImageUrl: "http://example.com/cellar.png",
        Path: "Tomb of Annihilation/LV 2 Cellar"
      };
      InitializeTestSettings({ PlayerView: { SceneLibrary: [scene] } });

      const view = renderPane();

      fireEvent.click(view.getByText("Tomb of Annihilation"));
      expect(view.queryByText("Cellar Entrance")).toBeFalsy();

      fireEvent.click(view.getByText("LV 2 Cellar"));
      expect(view.getByText("Cellar Entrance")).toBeTruthy();
    });

    test("scenes sharing a Path are grouped under the same folder", () => {
      const scenes: SavedScene[] = [
        {
          Id: "scene-0",
          Name: "Cellar Entrance",
          ImageUrl: "http://example.com/cellar.png",
          Path: "Tomb of Annihilation"
        },
        {
          Id: "scene-1",
          Name: "Crystal Cave",
          ImageUrl: "http://example.com/cave.png",
          Path: "Tomb of Annihilation"
        }
      ];
      InitializeTestSettings({ PlayerView: { SceneLibrary: scenes } });

      const view = renderPane();

      expect(view.getAllByText("Tomb of Annihilation").length).toBe(1);

      fireEvent.click(view.getByText("Tomb of Annihilation"));

      expect(view.getByText("Cellar Entrance")).toBeTruthy();
      expect(view.getByText("Crystal Cave")).toBeTruthy();
    });
  });

  describe("alphabetical sorting", () => {
    function sceneNames(view: ReturnType<typeof renderPane>): string[] {
      return Array.from(
        view.container.querySelectorAll(".c-scene-library__name")
      ).map(el => el.textContent);
    }

    test("root scenes render alphabetically by Name regardless of add order", () => {
      const scenes: SavedScene[] = [
        { Id: "scene-0", Name: "Zenith Tower", ImageUrl: "http://example.com/z.png" },
        { Id: "scene-1", Name: "Ancient Ruins", ImageUrl: "http://example.com/a.png" },
        { Id: "scene-2", Name: "Moonlit Dock", ImageUrl: "http://example.com/m.png" }
      ];
      InitializeTestSettings({ PlayerView: { SceneLibrary: scenes } });

      const view = renderPane();

      expect(sceneNames(view)).toEqual([
        "Ancient Ruins",
        "Moonlit Dock",
        "Zenith Tower"
      ]);
    });

    test("scenes within a folder render alphabetically by Name regardless of add order", () => {
      const scenes: SavedScene[] = [
        {
          Id: "scene-0",
          Name: "Zaldara",
          ImageUrl: "http://example.com/z.png",
          Path: "Tomb of Annihilation"
        },
        {
          Id: "scene-1",
          Name: "Crystal Cave",
          ImageUrl: "http://example.com/c.png",
          Path: "Tomb of Annihilation"
        }
      ];
      InitializeTestSettings({ PlayerView: { SceneLibrary: scenes } });

      const view = renderPane();
      fireEvent.click(view.getByText("Tomb of Annihilation"));

      expect(sceneNames(view)).toEqual(["Crystal Cave", "Zaldara"]);
    });
  });
});
