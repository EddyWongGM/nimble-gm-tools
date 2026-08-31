import { StatBlock } from "../../common/StatBlock";
import { Encounter } from "../Encounter/Encounter";
import { InitializeTestSettings } from "../test/InitializeTestSettings";
import { addCombatantFromStatBlock } from "../test/addCombatant";
import { buildEncounter } from "../test/buildEncounter";

describe("Index labeling", () => {
  let encounter: Encounter;
  beforeEach(() => {
    InitializeTestSettings({ Rules: { AlwaysNumberMonsters: false } });
    encounter = buildEncounter();
  });

  test("A lone combatant is not index labelled.", () => {
    const statBlock = { ...StatBlock.Default(), Name: "Goblin" };
    const combatant1 = addCombatantFromStatBlock(encounter, statBlock);
    expect(combatant1.DisplayName()).toEqual("Goblin");
  });

  test("When multiple combatants are added with the same name, they should display index labels.", () => {
    const statBlock = { ...StatBlock.Default(), Name: "Goblin" };

    const combatant1 = addCombatantFromStatBlock(encounter, statBlock);
    const combatant2 = addCombatantFromStatBlock(encounter, statBlock);
    expect(combatant1.DisplayName()).toEqual("Goblin 1");
    expect(combatant2.DisplayName()).toEqual("Goblin 2");
  });

  test("When a combatant statblock name changes, it receives an index label if necessary", () => {
    const statBlock1 = { ...StatBlock.Default(), Name: "Goblin" };
    const statBlock2 = { ...StatBlock.Default(), Name: "Not Goblin" };

    const combatant1 = addCombatantFromStatBlock(encounter, statBlock1);
    const combatant2 = addCombatantFromStatBlock(encounter, statBlock2);
    combatant2.StatBlock(statBlock1);

    expect(combatant1.DisplayName()).toEqual("Goblin 1");
    expect(combatant2.DisplayName()).toEqual("Goblin 2");
  });

  test("When all combatants the same name are removed, index labelling should reset.", () => {
    const statBlock = { ...StatBlock.Default(), Name: "Goblin" };

    const combatant1 = addCombatantFromStatBlock(encounter, statBlock);
    const combatant2 = addCombatantFromStatBlock(encounter, statBlock);
    encounter.RemoveCombatant(combatant1);
    encounter.RemoveCombatant(combatant2);
    encounter.FlushCombatants();

    const newCombatant1 = addCombatantFromStatBlock(encounter, statBlock);

    expect(newCombatant1.DisplayName()).toEqual("Goblin");

    const newCombatant2 = addCombatantFromStatBlock(encounter, statBlock);

    expect(newCombatant1.DisplayName()).toEqual("Goblin 1");
    expect(newCombatant2.DisplayName()).toEqual("Goblin 2");
  });

  test("When a labelled combatant is removed, its index label is not reused.", () => {
    const statBlock = { ...StatBlock.Default(), Name: "Goblin" };

    const combatant1 = addCombatantFromStatBlock(encounter, statBlock);
    const combatant2 = addCombatantFromStatBlock(encounter, statBlock);
    encounter.RemoveCombatant(combatant2);

    const combatant3 = addCombatantFromStatBlock(encounter, statBlock);

    expect(combatant1.DisplayName()).toEqual("Goblin 1");
    expect(combatant2.DisplayName()).toEqual("Goblin 2");
    expect(combatant3.DisplayName()).toEqual("Goblin 3");
  });

  function buildEncounterState() {
    const statBlock = { ...StatBlock.Default(), Name: "Goblin" };
    const oldEncounter = buildEncounter();
    for (const initiative of [8, 10]) {
      const combatant = addCombatantFromStatBlock(oldEncounter, statBlock);
      combatant.Initiative(initiative);
    }
    oldEncounter.EncounterFlow.StartEncounter();
    const savedEncounter = oldEncounter.ObservableEncounterState();
    return savedEncounter;
  }

  test("When a saved encounter state is loaded, it keeps the correct index labels", () => {
    const encounterState = buildEncounterState();
    const newEncounter = buildEncounter();
    newEncounter.LoadEncounterState(encounterState, () => {}, null);

    const combatantDisplayNames = newEncounter
      .Combatants()
      .map(c => c.DisplayName());
    expect(combatantDisplayNames).toContain("Goblin 2");
    expect(combatantDisplayNames).toContain("Goblin 1");
  });

  describe("Rules.AlwaysNumberMonsters", () => {
    beforeEach(() => {
      InitializeTestSettings({ Rules: { AlwaysNumberMonsters: true } });
    });

    test("Monsters are numbered sequentially across different names, in the order added", () => {
      const goblin = { ...StatBlock.Default(), Name: "Goblin" };
      const zombie = { ...StatBlock.Default(), Name: "Zombie" };

      const goblin1 = addCombatantFromStatBlock(encounter, goblin);
      const goblin2 = addCombatantFromStatBlock(encounter, goblin);
      const zombie1 = addCombatantFromStatBlock(encounter, zombie);
      const zombie2 = addCombatantFromStatBlock(encounter, zombie);

      expect(goblin1.DisplayName()).toEqual("Goblin 1");
      expect(goblin2.DisplayName()).toEqual("Goblin 2");
      expect(zombie1.DisplayName()).toEqual("Zombie 3");
      expect(zombie2.DisplayName()).toEqual("Zombie 4");
    });

    test("Duplicating a monster (which copies its full saved state, including its IndexLabel) gives the copy its own number", () => {
      const skeleton = { ...StatBlock.Default(), Name: "Skeleton" };
      const original = addCombatantFromStatBlock(encounter, skeleton);

      // Mirrors CombatantCommander.Duplicate: copies the source's full
      // GetState(), IndexLabel included, onto a new combatant Id.
      encounter.AddCombatantFromState({
        ...original.GetState(),
        Id: "duplicate-id"
      });
      const duplicate = encounter
        .Combatants()
        .find(c => c.Id === "duplicate-id");

      expect(original.IndexLabel()).toEqual(1);
      expect(duplicate.IndexLabel()).toEqual(2);
    });

    test("A lone monster is still numbered", () => {
      const statBlock = { ...StatBlock.Default(), Name: "Goblin" };
      const combatant = addCombatantFromStatBlock(encounter, statBlock);
      expect(combatant.DisplayName()).toEqual("Goblin 1");
    });

    test("Player characters are not numbered", () => {
      const statBlock = {
        ...StatBlock.Default(),
        Name: "Fenwick",
        Player: "player"
      };
      const combatant = addCombatantFromStatBlock(encounter, statBlock);
      expect(combatant.DisplayName()).toEqual("Fenwick");
    });

    test("Companions are not numbered, same as player characters", () => {
      const statBlock = {
        ...StatBlock.Default(),
        Name: "Wolf",
        Player: "companion"
      };
      const combatant = addCombatantFromStatBlock(encounter, statBlock);
      expect(combatant.DisplayName()).toEqual("Wolf");
    });

    test("A lone Legendary monster is not numbered - it's solo/unique by design", () => {
      const statBlock = {
        ...StatBlock.Default(),
        Name: "Ancient Dragon",
        Player: "legendary"
      };
      const combatant = addCombatantFromStatBlock(encounter, statBlock);
      expect(combatant.DisplayName()).toEqual("Ancient Dragon");
    });
  });

  test("Two Legendary monsters sharing a name are still numbered, for disambiguation (AlwaysNumberMonsters off)", () => {
    const statBlock = {
      ...StatBlock.Default(),
      Name: "Ancient Dragon",
      Player: "legendary"
    };
    const first = addCombatantFromStatBlock(encounter, statBlock);
    const second = addCombatantFromStatBlock(encounter, statBlock);
    expect(first.DisplayName()).toEqual("Ancient Dragon 1");
    expect(second.DisplayName()).toEqual("Ancient Dragon 2");
  });
});
