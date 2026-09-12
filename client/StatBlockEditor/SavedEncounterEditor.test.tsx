import * as Enzyme from "enzyme";
import * as React from "react";
import { act } from "react-dom/test-utils";

import { SavedEncounterEditor } from "./SavedEncounterEditor";
import { SavedEncounter } from "../../common/SavedEncounter";

const CURRENT_APP_VERSION = require("../../package.json").version;
process.env.VERSION = CURRENT_APP_VERSION;

describe("SavedEncounterEditor", () => {
  let editor: Enzyme.ReactWrapper<any, any>;
  let saveCallback: jest.Mock<void>;
  let savedEncounter: SavedEncounter;

  beforeEach(() => {
    savedEncounter = {
      ...SavedEncounter.Default(),
      Name: "Room 3: The Sunken Library",
      Path: "Tomb of Annihilation"
    };
    saveCallback = jest.fn();
    editor = Enzyme.mount(
      <SavedEncounterEditor
        savedEncounter={savedEncounter}
        onClose={jest.fn()}
        onSave={saveCallback}
      />
    );
  });

  afterEach(() => {
    editor.unmount();
  });

  function simulate(
    selector: string,
    event: string,
    data?: Record<string, unknown>
  ) {
    act(() => {
      editor.find(selector).simulate(event, data);
    });
    editor.update();
  }

  async function submitEditor() {
    await act(async () => {
      editor.find("form.c-statblock-editor").simulate("submit");
      await Promise.resolve();
    });
    editor.update();
  }

  test("Saves standard-mode field changes", async () => {
    simulate(`input[name="Path"]`, "change", {
      target: { name: "Path", value: "New Folder" }
    });

    await submitEditor();

    expect(saveCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        Name: "Room 3: The Sunken Library",
        Path: "New Folder"
      })
    );
  });

  test("Switching to JSON mode keeps Name/Path visible but hides Combatants and shows a JSON textarea", () => {
    simulate(`.c-statblock-editor__json-button`, "click");

    // Name/Path always come from the standard fields, in both modes - see
    // JsonEditorMode.ts.
    expect(editor.find(`input[name="Path"]`)).toHaveLength(1);
    expect(editor.find(`FieldArray`)).toHaveLength(0);
    expect(
      editor.find(`textarea[name="SavedEncounterJSON"]`)
    ).toHaveLength(1);
  });

  test("Saves JSON-mode edits, merging Id/Name/Path/Version from the standard fields", async () => {
    simulate(`.c-statblock-editor__json-button`, "click");

    const editedJSON = JSON.stringify({
      Combatants: [],
      BackgroundImageUrl: "https://example.com/room.png"
    });
    simulate(`textarea[name="SavedEncounterJSON"]`, "change", {
      target: { name: "SavedEncounterJSON", value: editedJSON }
    });

    await submitEditor();

    expect(saveCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        Id: savedEncounter.Id,
        Name: "Room 3: The Sunken Library",
        Path: "Tomb of Annihilation",
        Version: CURRENT_APP_VERSION,
        BackgroundImageUrl: "https://example.com/room.png"
      })
    );
  });

  test("Shows a validation error for invalid JSON instead of saving", async () => {
    simulate(`.c-statblock-editor__json-button`, "click");
    simulate(`textarea[name="SavedEncounterJSON"]`, "change", {
      target: { name: "SavedEncounterJSON", value: "{ not valid json" }
    });

    await submitEditor();

    expect(saveCallback).not.toHaveBeenCalled();
    expect(editor.find(".c-statblock-editor__error").text()).toContain(
      "JSON"
    );
  });
});
