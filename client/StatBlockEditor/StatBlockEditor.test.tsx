import * as Enzyme from "enzyme";
import * as React from "react";
import { act } from "react-dom/test-utils";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { StatBlockEditor } from "./StatBlockEditor";
import { EnumToggle } from "./EnumToggle";

import { StatBlock } from "../../common/StatBlock";
import { Listing } from "../Library/Listing";
import { Listable } from "../../common/Listable";

const CURRENT_APP_VERSION = require("../../package.json").version;
process.env.VERSION = CURRENT_APP_VERSION;

describe("StatBlockEditor", () => {
  let editor: Enzyme.ReactWrapper<any, any>;
  let saveCallback: jest.Mock<void>;
  let saveAsCallback: jest.Mock<void>;
  let saveAsCharacterCallback: jest.Mock<void>;
  let statBlock: StatBlock;

  beforeEach(() => {
    statBlock = { ...StatBlock.Default(), Name: "Creature" };
    const listing = new Listing<Listable>(
      {
        ...statBlock,
        SearchHint: StatBlock.GetSearchHint(statBlock),
        FilterDimensions: StatBlock.FilterDimensions(statBlock),
        Link: "/",
        LastUpdateMs: 0
      },
      "localAsync",
      statBlock
    );
    saveCallback = jest.fn();
    saveAsCallback = jest.fn();
    saveAsCharacterCallback = jest.fn();
    editor = Enzyme.mount(
      <StatBlockEditor
        statBlock={statBlock}
        editorTarget="library"
        onClose={jest.fn()}
        onSave={saveCallback}
        onSaveAsCopy={saveAsCallback}
        onSaveAsCharacter={saveAsCharacterCallback}
        currentListings={[listing]}
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

  test("Calls saveCallback with the provided statblock", async () => {
    await submitEditor();

    expect(saveCallback).toHaveBeenCalledWith({
      ...statBlock,
      CustomFields: []
    });
  });

  test("Saves name changes", async () => {
    simulate(`input[name="Name"]`, "change", {
      target: { name: "Name", value: "Snarf" }
    });

    await submitEditor();

    expect(saveCallback).toHaveBeenCalledWith(
      expect.objectContaining({ Name: "Snarf" })
    );
  });

  test("Saves path changes", async () => {
    simulate(`.autohide-field__open-button`, "click");
    simulate(`input[name="Path"]`, "change", {
      target: { name: "Path", value: "SomeFolder" }
    });

    await submitEditor();

    expect(saveCallback).toHaveBeenCalledWith(
      expect.objectContaining({ Path: "SomeFolder" })
    );
  });

  test("Saves current version", async () => {
    await submitEditor();

    expect(saveCallback).toHaveBeenCalledWith(
      expect.objectContaining({ Version: CURRENT_APP_VERSION })
    );
  });

  test("Parses numeric fields", async () => {
    simulate(`input[name="HP.Value"]`, "change", {
      target: { name: "HP.Value", value: "10" }
    });

    await submitEditor();

    expect(saveCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        HP: expect.objectContaining({ Value: 10 })
      })
    );
  });

  test("Saves CR Rating changes for a Normal monster", async () => {
    simulate(`input[name="CRRating"]`, "change", {
      target: { name: "CRRating", value: "1/4" }
    });

    await submitEditor();

    expect(saveCallback).toHaveBeenCalledWith(
      expect.objectContaining({ CRRating: "1/4" })
    );
  });

  test("Hides CR Rating field once the monster is Legendary", () => {
    const tierToggle = editor
      .find(EnumToggle)
      .filterWhere(w => w.prop("fieldName") === "Player");
    act(() => {
      tierToggle.find("button").simulate("click");
    });
    editor.update();

    expect(editor.find(`input[name="CRRating"]`)).toHaveLength(0);
  });

  test("Hides the hero-count HP info tooltip for a Normal monster", () => {
    expect(editor.find(".c-info")).toHaveLength(0);
  });

  test("Shows the hero-count HP info tooltip once the monster is Legendary", () => {
    const tierToggle = editor
      .find(EnumToggle)
      .filterWhere(w => w.prop("fieldName") === "Player");
    act(() => {
      tierToggle.find("button").simulate("click");
    });
    editor.update();

    expect(editor.find(".c-info")).toHaveLength(1);
  });

  test("Shows separate armor HP pools instead of a single Defense/Hit Points row for a monster", () => {
    expect(editor.find(`input[name="AC.Value"]`)).toHaveLength(0);
    expect(editor.find(`input[name="HP.Value"]`)).toHaveLength(1);
    expect(editor.find(`input[name="HPMediumArmor.Value"]`)).toHaveLength(1);
    expect(editor.find(`input[name="HPHeavyArmor.Value"]`)).toHaveLength(1);
  });

  test("Saves Armor tier and per-armor HP changes for a monster", async () => {
    const armorToggle = editor
      .find(EnumToggle)
      .filterWhere(w => w.prop("fieldName") === "Armor");
    act(() => {
      armorToggle.find("button").simulate("click");
    });
    editor.update();

    simulate(`input[name="HPMediumArmor.Value"]`, "change", {
      target: { name: "HPMediumArmor.Value", value: "20" }
    });

    await submitEditor();

    expect(saveCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        Armor: "medium",
        HPMediumArmor: expect.objectContaining({ Value: 20 })
      })
    );
  });

  test("Shows and saves Save DC for a monster", async () => {
    expect(editor.find(`input[name="SaveDC"]`)).toHaveLength(1);

    simulate(`input[name="SaveDC"]`, "change", {
      target: { name: "SaveDC", value: "15" }
    });

    await submitEditor();

    expect(saveCallback).toHaveBeenCalledWith(
      expect.objectContaining({ SaveDC: 15 })
    );
  });

  // NameAndAdvantageField (like every SortableList row) is draggable via
  // react-dnd, which throws if mounted with no DndProvider ancestor - the
  // shared `editor` fixture above has none, so these two tests mount their
  // own editor wrapped in one instead of reusing it.
  test("Adds a Saves advantage entry and saves it", async () => {
    const saveDndCallback = jest.fn();
    const dndEditor = Enzyme.mount(
      <DndProvider backend={HTML5Backend}>
        <StatBlockEditor
          statBlock={statBlock}
          editorTarget="library"
          onClose={jest.fn()}
          onSave={saveDndCallback}
        />
      </DndProvider>
    );

    act(() => {
      dndEditor
        .find(".c-statblock-editor__saves .c-add-button")
        .first()
        .simulate("click");
    });
    dndEditor.update();

    act(() => {
      dndEditor.find(`input[name="Saves[0].Name"]`).simulate("change", {
        target: { name: "Saves[0].Name", value: "Int" }
      });
      dndEditor
        .find(`select[name="Saves[0].Advantage"]`)
        .simulate("change", {
          target: { name: "Saves[0].Advantage", value: "+" }
        });
    });
    dndEditor.update();

    await act(async () => {
      dndEditor.find("form.c-statblock-editor").simulate("submit");
      await Promise.resolve();
    });

    expect(saveDndCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        Saves: [{ Name: "Int", Advantage: "+" }]
      })
    );

    dndEditor.unmount();
  });

  test("Adds a Skills advantage entry and saves it", async () => {
    const saveDndCallback = jest.fn();
    const dndEditor = Enzyme.mount(
      <DndProvider backend={HTML5Backend}>
        <StatBlockEditor
          statBlock={statBlock}
          editorTarget="library"
          onClose={jest.fn()}
          onSave={saveDndCallback}
        />
      </DndProvider>
    );

    act(() => {
      dndEditor
        .find(".c-statblock-editor__skills .c-add-button")
        .first()
        .simulate("click");
    });
    dndEditor.update();

    act(() => {
      dndEditor.find(`input[name="Skills[0].Name"]`).simulate("change", {
        target: { name: "Skills[0].Name", value: "Perception" }
      });
      dndEditor
        .find(`select[name="Skills[0].Advantage"]`)
        .simulate("change", {
          target: { name: "Skills[0].Advantage", value: "++" }
        });
    });
    dndEditor.update();

    await act(async () => {
      dndEditor.find("form.c-statblock-editor").simulate("submit");
      await Promise.resolve();
    });

    expect(saveDndCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        Skills: [{ Name: "Perception", Advantage: "++" }]
      })
    );

    dndEditor.unmount();
  });

  test("Hides Last Stand HP field for a Normal monster", () => {
    expect(editor.find(`input[name="LastStandHP.Value"]`)).toHaveLength(0);
  });

  test("Shows and saves Last Stand HP field once the monster is Legendary", async () => {
    const tierToggle = editor
      .find(EnumToggle)
      .filterWhere(w => w.prop("fieldName") === "Player");
    act(() => {
      tierToggle.find("button").simulate("click");
    });
    editor.update();

    simulate(`input[name="LastStandHP.Value"]`, "change", {
      target: { name: "LastStandHP.Value", value: "10" }
    });

    await submitEditor();

    expect(saveCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        Player: "legendary",
        LastStandHP: expect.objectContaining({ Value: 10 })
      })
    );
  });

  test("Shows and saves Last Stand HP field once a Normal monster has Last Stand checked", async () => {
    simulate(`input[name="HasLastStand"]`, "change", {
      target: { name: "HasLastStand", type: "checkbox", checked: true }
    });

    simulate(`input[name="LastStandHP.Value"]`, "change", {
      target: { name: "LastStandHP.Value", value: "10" }
    });

    await submitEditor();

    expect(saveCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        Player: "",
        HasLastStand: true,
        LastStandHP: expect.objectContaining({ Value: 10 })
      })
    );
  });

  test("Shows the Last Stand info tooltip once a Normal monster has Last Stand checked", () => {
    simulate(`input[name="HasLastStand"]`, "change", {
      target: { name: "HasLastStand", type: "checkbox", checked: true }
    });

    expect(editor.find(".c-info")).toHaveLength(1);
  });

  test("calls saveAs when Save as a copy is checked", async () => {
    simulate(`input[name="Name"]`, "change", {
      target: { name: "Name", value: "Snarf" }
    });
    simulate(`input[name="Name"]`, "blur", { target: { name: "Name" } });
    act(() => {
      editor.instance().forceUpdate();
    });
    simulate(`.c-toggle#toggle_SaveAs`, "click");

    await submitEditor();

    const editedStatBlock = saveAsCallback.mock.calls[0][0];
    expect(editedStatBlock.Id).not.toEqual(statBlock.Id);
    expect(editedStatBlock.Name).toEqual("Snarf");
    expect(editedStatBlock).not.toHaveProperty("SaveAs");
  });

  test("calls saveAsCharacter when Save as a character is checked", async () => {
    simulate(`input[name="Name"]`, "change", {
      target: { name: "Name", value: "Snarf" }
    });
    simulate(`input[name="Name"]`, "blur", { target: { name: "Name" } });
    act(() => {
      editor.instance().forceUpdate();
    });
    simulate(`.c-toggle#toggle_SaveAsCharacter`, "click");

    await submitEditor();

    const editedStatBlock = saveAsCharacterCallback.mock.calls[0][0];
    expect(editedStatBlock.Id).not.toEqual(statBlock.Id);
    expect(editedStatBlock.Name).toEqual("Snarf");
    expect(editedStatBlock).not.toHaveProperty("SaveAs");
  });

  test("parses JSON if JSON editor is used", async () => {
    const editedJSON = JSON.stringify({
      Type: "Edited in JSON"
    });

    simulate(`.c-statblock-editor__json-button`, "click");
    simulate(`textarea[name="StatBlockJSON"]`, "change", {
      target: { name: "StatBlockJSON", value: editedJSON }
    });

    await submitEditor();

    expect(saveCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        Name: "Creature",
        Type: "Edited in JSON"
      })
    );
  });

  describe("Room stat block", () => {
    // Each click must be its own act()+update() - the toggle's onClick
    // closes over the value from the last commit, so batching multiple
    // simulated clicks into one act() call (with no render in between)
    // makes them all read the same stale value instead of advancing
    // through the cycle once per click.
    function clickPlayerToggle() {
      const tierToggle = editor
        .find(EnumToggle)
        .filterWhere(w => w.prop("fieldName") === "Player");
      act(() => {
        tierToggle.find("button").simulate("click");
      });
      editor.update();
    }

    function cycleToRoom() {
      clickPlayerToggle(); // Normal -> Legendary
      clickPlayerToggle(); // Legendary -> Titan
      clickPlayerToggle(); // Titan -> Room
    }

    test("Clears Challenge and Armor at save time when converted to a Room", async () => {
      simulate(`input[name="Challenge"]`, "change", {
        target: { name: "Challenge", value: "4" }
      });
      const armorToggle = editor
        .find(EnumToggle)
        .filterWhere(w => w.prop("fieldName") === "Armor");
      act(() => {
        armorToggle.find("button").simulate("click");
      });
      editor.update();

      cycleToRoom();

      await submitEditor();

      expect(saveCallback).toHaveBeenCalledWith(
        expect.objectContaining({ Player: "room", Challenge: "", Armor: "" })
      );
    });

    test("Previewing Room via the cyclic toggle and switching back preserves Challenge/Armor", async () => {
      simulate(`input[name="Challenge"]`, "change", {
        target: { name: "Challenge", value: "4" }
      });
      const armorToggle = editor
        .find(EnumToggle)
        .filterWhere(w => w.prop("fieldName") === "Armor");
      act(() => {
        armorToggle.find("button").simulate("click");
      });
      editor.update();

      cycleToRoom();
      clickPlayerToggle(); // Room -> Normal

      await submitEditor();

      expect(saveCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          Player: "",
          Challenge: "4",
          Armor: "medium"
        })
      );
    });

    test("Hides combat-mechanic fields and enlarges Description for a Room", () => {
      cycleToRoom();

      expect(editor.find(`.c-statblock-editor__stats`)).toHaveLength(0);
      expect(editor.find(`.c-statblock-editor__saves`)).toHaveLength(0);
      expect(editor.find(`.c-statblock-editor__skills`)).toHaveLength(0);
      expect(editor.find(`.c-statblock-editor__keywords`)).toHaveLength(0);
      expect(editor.find(`.c-statblock-editor__powers`)).toHaveLength(0);
      expect(
        editor.find(`textarea[name="Description"].c-statblock-editor__textarea--large`)
      ).toHaveLength(1);
    });
  });

  describe("Player character stat block", () => {
    test("Shows a single Defense/Hit Points row and no Armor toggle, unlike a monster", () => {
      const playerStatBlock = {
        ...StatBlock.Default(),
        Name: "Hero",
        Player: "player"
      };
      const playerEditor = Enzyme.mount(
        <StatBlockEditor
          statBlock={playerStatBlock}
          editorTarget="library"
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      expect(playerEditor.find(`input[name="AC.Value"]`)).toHaveLength(1);
      expect(playerEditor.find(`input[name="HP.Value"]`)).toHaveLength(1);
      expect(
        playerEditor.find(`input[name="HPMediumArmor.Value"]`)
      ).toHaveLength(0);
      expect(
        playerEditor.find(`input[name="HPHeavyArmor.Value"]`)
      ).toHaveLength(0);
      expect(
        playerEditor
          .find(EnumToggle)
          .filterWhere(w => w.prop("fieldName") === "Armor")
      ).toHaveLength(0);
      expect(playerEditor.find(`input[name="SaveDC"]`)).toHaveLength(0);
      expect(playerEditor.find(".c-statblock-editor__saves")).toHaveLength(0);
      expect(playerEditor.find(".c-statblock-editor__skills")).toHaveLength(
        0
      );

      playerEditor.unmount();
    });
  });
});
