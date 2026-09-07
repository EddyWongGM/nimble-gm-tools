import * as React from "react";
import { fireEvent, render, within } from "@testing-library/react";

import { StatBlock } from "../../common/StatBlock";
import { Encounter } from "../Encounter/Encounter";
import { InitializeTestSettings } from "../test/InitializeTestSettings";
import { addCombatantFromStatBlock } from "../test/addCombatant";
import { TrackerViewModel } from "../TrackerViewModel";
import { CombatantDetails } from "./CombatantDetails";
import { CombatantViewModel } from "./CombatantViewModel";

function buildCombatantViewModel(): {
  trackerViewModel: TrackerViewModel;
  encounter: Encounter;
  combatantViewModel: CombatantViewModel;
  name: string;
} {
  InitializeTestSettings();
  const mockIo: any = { on: jest.fn(), emit: jest.fn() };
  const trackerViewModel = new TrackerViewModel(mockIo);
  const encounter = trackerViewModel.Encounter;
  addCombatantFromStatBlock(encounter, {
    ...StatBlock.Default(),
    Name: "Ogre",
    HP: { Value: 20 }
  });
  const combatantViewModel = trackerViewModel.CombatantViewModels()[0];
  // AddCombatantFromStatBlock appends a disambiguating index (e.g. "Ogre 1")
  // even for the first/only instance, so read the label back rather than
  // assuming the raw StatBlock name.
  const name = combatantViewModel.Name();
  return { trackerViewModel, encounter, combatantViewModel, name };
}

function hpLabel(name: string) {
  return `Apply damage or healing to ${name}`;
}

function tempHpLabel(name: string) {
  return `Grant temporary HP to ${name}`;
}

function statButton(container: HTMLElement, label: string) {
  return within(container).getByRole("button", { name: label });
}

function statInput(container: HTMLElement, label: string) {
  return within(container).getByRole("spinbutton", { name: label });
}

describe("CombatantDetails inline stat editing", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("renders HP and Temp HP as plain read-only text until clicked", () => {
    const { combatantViewModel, name } = buildCombatantViewModel();
    const { container } = render(
      <CombatantDetails
        combatantViewModel={combatantViewModel}
        displayMode="status-only"
        key={combatantViewModel.Combatant.Id}
      />
    );

    expect(statButton(container, hpLabel(name)).textContent).toBe("20/20");
    expect(statButton(container, tempHpLabel(name)).textContent).toBe("0");
  });

  test("commits a positive delta as damage on Enter", () => {
    const { combatantViewModel, trackerViewModel, name } =
      buildCombatantViewModel();
    const { container } = render(
      <CombatantDetails
        combatantViewModel={combatantViewModel}
        displayMode="status-only"
        key={combatantViewModel.Combatant.Id}
      />
    );

    fireEvent.click(statButton(container, hpLabel(name)));
    fireEvent.change(statInput(container, hpLabel(name)), {
      target: { value: "5" }
    });
    fireEvent.keyDown(statInput(container, hpLabel(name)), { key: "Enter" });

    expect(statButton(container, hpLabel(name)).textContent).toBe("15/20");
    expect(trackerViewModel.EventLog.Events()).toEqual([
      `5 damage applied to ${name}.`
    ]);
  });

  test("commits a negative delta as healing on blur", () => {
    const { combatantViewModel, trackerViewModel, name } =
      buildCombatantViewModel();
    combatantViewModel.ApplyDamage("12");
    const { container } = render(
      <CombatantDetails
        combatantViewModel={combatantViewModel}
        displayMode="status-only"
        key={combatantViewModel.Combatant.Id}
      />
    );

    fireEvent.click(statButton(container, hpLabel(name)));
    fireEvent.change(statInput(container, hpLabel(name)), {
      target: { value: "-3" }
    });
    fireEvent.blur(statInput(container, hpLabel(name)));

    expect(statButton(container, hpLabel(name)).textContent).toBe("11/20");
    expect(trackerViewModel.EventLog.Events()[0]).toBe(
      `3 HP restored to ${name}.`
    );
  });

  test("ignores a blank or zero commit", () => {
    const { combatantViewModel, trackerViewModel, name } =
      buildCombatantViewModel();
    const { container } = render(
      <CombatantDetails
        combatantViewModel={combatantViewModel}
        displayMode="status-only"
        key={combatantViewModel.Combatant.Id}
      />
    );

    fireEvent.click(statButton(container, hpLabel(name)));
    fireEvent.blur(statInput(container, hpLabel(name)));

    expect(statButton(container, hpLabel(name)).textContent).toBe("20/20");
    expect(trackerViewModel.EventLog.Events()).toEqual([]);
  });

  test("Escape discards the edit without committing", () => {
    const { combatantViewModel, trackerViewModel, name } =
      buildCombatantViewModel();
    const { container } = render(
      <CombatantDetails
        combatantViewModel={combatantViewModel}
        displayMode="status-only"
        key={combatantViewModel.Combatant.Id}
      />
    );

    fireEvent.click(statButton(container, hpLabel(name)));
    fireEvent.change(statInput(container, hpLabel(name)), {
      target: { value: "7" }
    });
    fireEvent.keyDown(statInput(container, hpLabel(name)), { key: "Escape" });

    expect(statButton(container, hpLabel(name)).textContent).toBe("20/20");
    expect(trackerViewModel.EventLog.Events()).toEqual([]);
  });

  test("Enter does not double-commit via the unmount-flush cleanup", () => {
    const { combatantViewModel, trackerViewModel, name } =
      buildCombatantViewModel();
    const { container } = render(
      <CombatantDetails
        combatantViewModel={combatantViewModel}
        displayMode="status-only"
        key={combatantViewModel.Combatant.Id}
      />
    );

    fireEvent.click(statButton(container, hpLabel(name)));
    fireEvent.change(statInput(container, hpLabel(name)), {
      target: { value: "5" }
    });
    fireEvent.keyDown(statInput(container, hpLabel(name)), { key: "Enter" });

    expect(trackerViewModel.EventLog.Events()).toHaveLength(1);
    expect(statButton(container, hpLabel(name)).textContent).toBe("15/20");
  });

  test("flushes a pending edit from the effect cleanup when unmounted without a blur (selection-change remount)", () => {
    const { combatantViewModel, trackerViewModel, name } =
      buildCombatantViewModel();
    const { container, unmount } = render(
      <CombatantDetails
        combatantViewModel={combatantViewModel}
        displayMode="status-only"
        key={combatantViewModel.Combatant.Id}
      />
    );

    fireEvent.click(statButton(container, hpLabel(name)));
    fireEvent.change(statInput(container, hpLabel(name)), {
      target: { value: "9" }
    });
    // No blur fired here - simulates CombatantDetails being torn down by a
    // `key` change on selection change before the input can blur.
    unmount();

    expect(combatantViewModel.HP()).toBe("11/20");
    expect(trackerViewModel.EventLog.Events()).toEqual([
      `9 damage applied to ${name}.`
    ]);
  });

  test("Temp HP grant is absolute (set-if-greater), not a delta", () => {
    const { combatantViewModel, name } = buildCombatantViewModel();
    const { container } = render(
      <CombatantDetails
        combatantViewModel={combatantViewModel}
        displayMode="status-only"
        key={combatantViewModel.Combatant.Id}
      />
    );

    fireEvent.click(statButton(container, tempHpLabel(name)));
    fireEvent.change(statInput(container, tempHpLabel(name)), {
      target: { value: "5" }
    });
    fireEvent.keyDown(statInput(container, tempHpLabel(name)), {
      key: "Enter"
    });
    expect(statButton(container, tempHpLabel(name)).textContent).toBe("5");

    fireEvent.click(statButton(container, tempHpLabel(name)));
    fireEvent.change(statInput(container, tempHpLabel(name)), {
      target: { value: "3" }
    });
    fireEvent.keyDown(statInput(container, tempHpLabel(name)), {
      key: "Enter"
    });

    // A lower grant does not reduce existing Temporary HP.
    expect(statButton(container, tempHpLabel(name)).textContent).toBe("5");
  });
});
