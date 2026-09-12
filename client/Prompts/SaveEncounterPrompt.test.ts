import { CombatantState } from "../../common/CombatantState";
import { StatBlock } from "../../common/StatBlock";
import { CollapseScaledGroups } from "./SaveEncounterPrompt";

function buildCombatantState(
  overrides: Partial<CombatantState> & { Id: string }
): CombatantState {
  return {
    StatBlock: StatBlock.Default(),
    Alias: "",
    IndexLabel: null,
    CurrentHP: 1,
    TemporaryHP: 0,
    Initiative: 0,
    Tags: [],
    Hidden: false,
    RevealedAC: false,
    InterfaceVersion: process.env.VERSION,
    ...overrides
  };
}

describe("CollapseScaledGroups", () => {
  test("leaves combatants with no ScaledGroupId unaffected", () => {
    const combatants = [
      buildCombatantState({ Id: "a" }),
      buildCombatantState({ Id: "b" })
    ];

    expect(CollapseScaledGroups(combatants)).toEqual(combatants);
  });

  test("collapses a shared ScaledGroupId down to its first member", () => {
    const combatants = [
      buildCombatantState({ Id: "goblin-1", ScaledGroupId: "group-1" }),
      buildCombatantState({ Id: "goblin-2", ScaledGroupId: "group-1" }),
      buildCombatantState({ Id: "goblin-3", ScaledGroupId: "group-1" })
    ];

    const collapsed = CollapseScaledGroups(combatants);

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].Id).toBe("goblin-1");
  });

  test("strips ScaledGroupId off the kept combatant", () => {
    const combatants = [
      buildCombatantState({ Id: "goblin-1", ScaledGroupId: "group-1" }),
      buildCombatantState({ Id: "goblin-2", ScaledGroupId: "group-1" })
    ];

    const collapsed = CollapseScaledGroups(combatants);

    expect(collapsed[0].ScaledGroupId).toBeUndefined();
  });

  test("collapses multiple distinct groups independently, keeping ungrouped combatants", () => {
    const combatants = [
      buildCombatantState({ Id: "goblin-1", ScaledGroupId: "goblins" }),
      buildCombatantState({ Id: "goblin-2", ScaledGroupId: "goblins" }),
      buildCombatantState({ Id: "ogre-1", ScaledGroupId: "ogres" }),
      buildCombatantState({ Id: "ogre-2", ScaledGroupId: "ogres" }),
      buildCombatantState({ Id: "boss" })
    ];

    const collapsed = CollapseScaledGroups(combatants);

    expect(collapsed.map(c => c.Id)).toEqual(["goblin-1", "ogre-1", "boss"]);
  });

  test("a group with some members excluded beforehand still collapses the remaining ones to one", () => {
    // Simulates a GM unchecking some copies in the Include list before this
    // function ever sees the array - onSubmit filters by inclusion first.
    const combatants = [
      buildCombatantState({ Id: "goblin-2", ScaledGroupId: "goblins" }),
      buildCombatantState({ Id: "goblin-4", ScaledGroupId: "goblins" })
    ];

    const collapsed = CollapseScaledGroups(combatants);

    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].Id).toBe("goblin-2");
  });
});
