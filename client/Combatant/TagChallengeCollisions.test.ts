import { StatBlock } from "../../common/StatBlock";
import { Encounter } from "../Encounter/Encounter";
import { InitializeTestSettings } from "../test/InitializeTestSettings";
import { addCombatantFromStatBlock } from "../test/addCombatant";
import { buildEncounter } from "../test/buildEncounter";

function tagTexts(combatant) {
  return combatant.Tags().map(t => t.Text);
}

describe("TagChallengeCollisions", () => {
  let encounter: Encounter;
  beforeEach(() => {
    InitializeTestSettings({ Rules: { AlwaysNumberMonsters: false } });
    encounter = buildEncounter();
  });

  test("A lone monster gets no Challenge tag", () => {
    const statBlock = { ...StatBlock.Default(), Name: "Goblin", Challenge: "1" };
    const combatant = addCombatantFromStatBlock(encounter, statBlock);
    expect(tagTexts(combatant)).toEqual([]);
  });

  test("Same-name monsters at the same Challenge get no tag", () => {
    const statBlock = { ...StatBlock.Default(), Name: "Goblin", Challenge: "1" };
    const combatant1 = addCombatantFromStatBlock(encounter, statBlock);
    const combatant2 = addCombatantFromStatBlock(encounter, statBlock);
    expect(tagTexts(combatant1)).toEqual([]);
    expect(tagTexts(combatant2)).toEqual([]);
  });

  test("Same-name monsters at different Challenges both get a Challenge tag", () => {
    const weak = { ...StatBlock.Default(), Name: "Goblin", Challenge: "1/2" };
    const minion = { ...StatBlock.Default(), Name: "Goblin", Challenge: "Minion" };

    const combatant1 = addCombatantFromStatBlock(encounter, weak);
    const combatant2 = addCombatantFromStatBlock(encounter, minion);

    expect(tagTexts(combatant1)).toEqual(["LV 1/2"]);
    expect(tagTexts(combatant2)).toEqual(["Minion"]);
  });

  test("A numeric/fraction Challenge tag ('LV n') stays hidden from players", () => {
    const weak = { ...StatBlock.Default(), Name: "Goblin", Challenge: "1/2" };
    const minion = { ...StatBlock.Default(), Name: "Goblin", Challenge: "Minion" };

    const combatant1 = addCombatantFromStatBlock(encounter, weak);
    addCombatantFromStatBlock(encounter, minion);

    expect(combatant1.Tags()[0].HiddenFromPlayerView).toBe(true);
  });

  test("A word-based Challenge tag ('Minion') is revealed to players", () => {
    const weak = { ...StatBlock.Default(), Name: "Goblin", Challenge: "1/2" };
    const minion = { ...StatBlock.Default(), Name: "Goblin", Challenge: "Minion" };

    addCombatantFromStatBlock(encounter, weak);
    const combatant2 = addCombatantFromStatBlock(encounter, minion);

    expect(combatant2.Tags()[0].HiddenFromPlayerView).toBe(false);
  });

  test("A third same-name monster at yet another Challenge tags everyone, without duplicating existing tags", () => {
    const one = { ...StatBlock.Default(), Name: "Goblin", Challenge: "1" };
    const two = { ...StatBlock.Default(), Name: "Goblin", Challenge: "2" };
    const three = { ...StatBlock.Default(), Name: "Goblin", Challenge: "3" };

    const combatant1 = addCombatantFromStatBlock(encounter, one);
    const combatant2 = addCombatantFromStatBlock(encounter, two);
    const combatant3 = addCombatantFromStatBlock(encounter, three);

    expect(tagTexts(combatant1)).toEqual(["LV 1"]);
    expect(tagTexts(combatant2)).toEqual(["LV 2"]);
    expect(tagTexts(combatant3)).toEqual(["LV 3"]);
  });

  test("A monster whose Name already contains its Challenge word gets no redundant tag", () => {
    const goblinMinion = {
      ...StatBlock.Default(),
      Name: "Goblin Minion",
      Challenge: "Minion"
    };
    const goblin = { ...StatBlock.Default(), Name: "Goblin Minion", Challenge: "1" };

    const combatant1 = addCombatantFromStatBlock(encounter, goblinMinion);
    const combatant2 = addCombatantFromStatBlock(encounter, goblin);

    expect(tagTexts(combatant1)).toEqual([]);
    expect(tagTexts(combatant2)).toEqual(["LV 1"]);
  });
});
