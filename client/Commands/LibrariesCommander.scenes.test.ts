import * as moment from "moment";

import { SavedScene } from "../../common/PlayerViewSettings";
import { InitializeTestSettings } from "../test/InitializeTestSettings";
import { LibrariesCommander } from "./LibrariesCommander";

const saveAsMock = jest.fn();
jest.mock("browser-filesaver", () => ({
  saveAs: (...args: unknown[]) => saveAsMock(...args)
}));

function makeScene(id: string, name: string): SavedScene {
  return { Id: id, Name: name, ImageUrl: `http://example.com/${id}.png` };
}

function setup() {
  const SaveUpdatedSettings = jest.fn();
  const commander = new LibrariesCommander(
    { SaveUpdatedSettings } as any,
    null as any
  );
  return { commander, SaveUpdatedSettings };
}

describe("LibrariesCommander scenes backup", () => {
  beforeEach(() => {
    saveAsMock.mockClear();
  });

  describe("ExportScenes", () => {
    it("exports the current scene library with a date-stamped filename", () => {
      const scenes = [makeScene("scene-1", "Camp")];
      InitializeTestSettings({ PlayerView: { SceneLibrary: scenes } });
      const { commander } = setup();

      commander.ExportScenes();

      expect(saveAsMock).toHaveBeenCalledWith(
        expect.anything(),
        `nimble-gm-tools-scenes-${moment().format("YYYY-MM-DD")}.json`
      );
    });
  });

  describe("ImportScenes", () => {
    it("overwrites an existing scene in place by Id, leaving other scenes untouched", async () => {
      const existing = makeScene("scene-1", "Old Camp");
      const other = makeScene("scene-2", "Other");
      InitializeTestSettings({
        PlayerView: { SceneLibrary: [existing, other] }
      });
      const { commander, SaveUpdatedSettings } = setup();

      const imported = { ...existing, Name: "New Camp" };
      const file = new File([JSON.stringify([imported])], "scenes.json", {
        type: "application/json"
      });

      await new Promise<void>(resolve => {
        SaveUpdatedSettings.mockImplementation(() => resolve());
        commander.ImportScenes(file);
      });

      const savedSettings = SaveUpdatedSettings.mock.calls[0][0];
      expect(savedSettings.PlayerView.SceneLibrary).toEqual([imported, other]);
    });

    it("appends a new scene without disturbing existing ones", async () => {
      const existing = makeScene("scene-1", "Camp");
      InitializeTestSettings({ PlayerView: { SceneLibrary: [existing] } });
      const { commander, SaveUpdatedSettings } = setup();

      const newScene = makeScene("scene-2", "New Place");
      const file = new File([JSON.stringify([newScene])], "scenes.json", {
        type: "application/json"
      });

      await new Promise<void>(resolve => {
        SaveUpdatedSettings.mockImplementation(() => resolve());
        commander.ImportScenes(file);
      });

      const savedSettings = SaveUpdatedSettings.mock.calls[0][0];
      expect(savedSettings.PlayerView.SceneLibrary).toEqual([
        existing,
        newScene
      ]);
    });

    it("does not call SaveUpdatedSettings when the file isn't valid JSON", async () => {
      const alertMock = jest
        .spyOn(window, "alert")
        .mockImplementation(() => {});
      const existing = makeScene("scene-1", "Camp");
      InitializeTestSettings({ PlayerView: { SceneLibrary: [existing] } });
      const { commander, SaveUpdatedSettings } = setup();

      const file = new File(["not json"], "scenes.json", {
        type: "application/json"
      });

      commander.ImportScenes(file);
      // ImportScenes has no failure callback to await, so wait for the
      // FileReader's onload (a macrotask) to have had a chance to run.
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(SaveUpdatedSettings).not.toHaveBeenCalled();
      expect(alertMock).toHaveBeenCalled();
      alertMock.mockRestore();
    });

    it.each([[{}], [null], [{ Id: "scene-1", Name: "Camp" }]])(
      "does not call SaveUpdatedSettings when the JSON parses but isn't an array (%p)",
      async json => {
        const alertMock = jest
          .spyOn(window, "alert")
          .mockImplementation(() => {});
        const existing = makeScene("scene-1", "Camp");
        InitializeTestSettings({ PlayerView: { SceneLibrary: [existing] } });
        const { commander, SaveUpdatedSettings } = setup();

        const file = new File([JSON.stringify(json)], "scenes.json", {
          type: "application/json"
        });

        commander.ImportScenes(file);
        // ImportScenes has no failure callback to await, so wait for the
        // FileReader's onload (a macrotask) to have had a chance to run.
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(SaveUpdatedSettings).not.toHaveBeenCalled();
        expect(alertMock).toHaveBeenCalled();
        alertMock.mockRestore();
      }
    );
  });
});
