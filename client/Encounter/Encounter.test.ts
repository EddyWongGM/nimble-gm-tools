import { buildEncounter } from "../test/buildEncounter";

import { PersistentCharacter } from "../../common/PersistentCharacter";
import { StatBlock } from "../../common/StatBlock";
import { Tag } from "../Combatant/Tag";
import { InitializeTestSettings } from "../test/InitializeTestSettings";
import { addCombatantFromStatBlock } from "../test/addCombatant";
import { GetTimerReadout } from "../Widgets/GetTimerReadout";
import { Encounter } from "./Encounter";

describe("Encounter", () => {
  let encounter: Encounter;
  beforeEach(() => {
    InitializeTestSettings();
    encounter = buildEncounter();
  });

  test("A new Encounter has no combatants", () => {
    expect(encounter.Combatants().length).toBe(0);
  });

  test("Adding a statblock results in a combatant", () => {
    const statBlock = StatBlock.Default();
    encounter.AddCombatantFromStatBlock(statBlock);
    expect(encounter.Combatants().length).toBe(1);
    expect(encounter.Combatants()[0].StatBlock()).toEqual(statBlock);
  });

  test("CombatantsHidden defaults to false and toggles via ToggleCombatantsHidden", () => {
    expect(encounter.CombatantsHidden()).toBe(false);
    expect(encounter.GetPlayerView().CombatantsHidden).toBe(false);

    encounter.ToggleCombatantsHidden();

    expect(encounter.CombatantsHidden()).toBe(true);
    expect(encounter.GetPlayerView().CombatantsHidden).toBe(true);

    encounter.ToggleCombatantsHidden();

    expect(encounter.CombatantsHidden()).toBe(false);
  });

  test("TemporaryBackgroundImageFit defaults to cover and is reflected in GetPlayerView", () => {
    expect(encounter.TemporaryBackgroundImageFit()).toBe("cover");
    expect(encounter.GetPlayerView().BackgroundImageFit).toBe("cover");

    encounter.TemporaryBackgroundImageFit("contain");

    expect(encounter.GetPlayerView().BackgroundImageFit).toBe("contain");
  });

  test("Combat should not be active", () => {
    expect(encounter.EncounterFlow.State()).toBe("inactive");
  });

  test("NextTurn changes the active combatant and will return to the top of the initiative order", () => {
    const combatant1 = addCombatantFromStatBlock(encounter);
    const combatant2 = addCombatantFromStatBlock(encounter);
    combatant1.Initiative(10);
    combatant2.Initiative(5);
    encounter.EncounterFlow.StartEncounter();

    const promptReroll = jest.fn();
    expect(encounter.EncounterFlow.ActiveCombatant()).toBe(
      encounter.Combatants()[0]
    );
    encounter.EncounterFlow.NextTurn(promptReroll);
    expect(encounter.EncounterFlow.ActiveCombatant()).toBe(
      encounter.Combatants()[1]
    );
    encounter.EncounterFlow.NextTurn(promptReroll);
    expect(encounter.EncounterFlow.ActiveCombatant()).toBe(
      encounter.Combatants()[0]
    );
    expect(promptReroll).not.toBeCalled();
  });

  test("Display post-combat stats produces reasonable results", () => {
    jest.useFakeTimers();

    for (let i = 0; i < 2; i++) {
      const thisCombatant = addCombatantFromStatBlock(encounter);
      thisCombatant.Initiative(2 - i);
      thisCombatant.Alias(`Combatant ${i}`);
    }

    encounter.EncounterFlow.StartEncounter();

    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(60 * 1000);
      encounter.EncounterFlow.NextTurn(jest.fn());
    }

    expect(
      GetTimerReadout(encounter.EncounterFlow.CombatTimer.ElapsedSeconds())
    ).toBe("5:00");

    const combatant0Elapsed = encounter
        .Combatants()[0]
        .CombatTimer.ElapsedSeconds(),
      combatant0Rounds = encounter.Combatants()[0].CombatTimer.ElapsedRounds();

    expect(GetTimerReadout(combatant0Elapsed / combatant0Rounds)).toBe("1:00");

    const combatant1Elapsed = encounter
        .Combatants()[1]
        .CombatTimer.ElapsedSeconds(),
      combatant1Rounds = encounter.Combatants()[1].CombatTimer.ElapsedRounds();

    expect(GetTimerReadout(combatant1Elapsed / combatant1Rounds)).toBe("0:40");
  });

  test("Should properly populate beancounters for monsters", () => {
    const combatant = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Traits: [
        {
          Name: "Spellcasting",
          Content:
            "• 1st level (4 slots): spell1, spell2\n• 2nd level (3 slots): spell3, spell4"
        },
        {
          Name: "Innate Spellcasting",
          Content: "3/day each: spell1, spell2\n1/day each: spell4, spell5"
        }
      ],
      Actions: [
        {
          Name: "Thrice Daily Action (3/Day)",
          Content: ""
        },
        {
          Name: "Recharge Action (Recharge 5-6)",
          Content: ""
        }
      ],
      LegendaryActions: [
        {
          Name: "",
          Content: ""
        }
      ],
      Player: ""
    });

    expect(combatant.CurrentNotes()).toBe(
      "Spellcasting Slots\n\n1st Level [4/4]\n\n2nd Level [3/3]\n\n" +
        "Innate Spellcasting Slots\n\n[3/3]\n\n[1/1]\n\n" +
        "Legendary Actions [3/3]\n\n" +
        "Thrice Daily Action [3/3]\n\n" +
        "Recharge Action [1/1]"
    );
  });

  describe("Initiative Ordering", () => {
    test("By roll", () => {
      const slow = addCombatantFromStatBlock(encounter);
      const fast = addCombatantFromStatBlock(encounter);
      expect(encounter.Combatants()).toEqual([slow, fast]);

      fast.Initiative(20);
      slow.Initiative(1);
      encounter.EncounterFlow.StartEncounter();
      expect(encounter.Combatants()).toEqual([fast, slow]);
    });

    test("By modifier", () => {
      const slow = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        InitiativeModifier: 0
      });
      const fast = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        InitiativeModifier: 2
      });
      encounter.EncounterFlow.StartEncounter();
      expect(encounter.Combatants()).toEqual([fast, slow]);
    });

    test("By group modifier", () => {
      const slow = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        InitiativeModifier: 0
      });
      const fast = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        InitiativeModifier: 2
      });
      const loner = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        InitiativeModifier: 1
      });
      slow.InitiativeGroup("group");
      fast.InitiativeGroup("group");
      encounter.EncounterFlow.StartEncounter();

      expect(encounter.Combatants()).toEqual([fast, slow, loner]);
    });

    test("Favor player characters", () => {
      const creature = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default()
      });
      const playerCharacter = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });
      encounter.EncounterFlow.StartEncounter();
      expect(encounter.Combatants()).toEqual([playerCharacter, creature]);
    });

    test("A companion is ranked by its own initiative modifier, not by phase, when modifiers differ", () => {
      const companion = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "companion",
        InitiativeModifier: 0
      });
      const monster = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        InitiativeModifier: 5
      });

      encounter.EncounterFlow.StartEncounter();

      // SortByInitiative (used by StartEncounter) ranks by initiative
      // modifier first - phase is only a tiebreak for equal modifiers, so a
      // higher-modifier monster still outranks a lower-modifier companion.
      // This is unlike SortByPhase (used by "Swap Phase Order"/"Group
      // Monsters"), which always keeps the companion with the players.
      expect(encounter.Combatants()).toEqual([monster, companion]);
    });

    test("A companion falls back to favoring the player side when initiative modifiers tie", () => {
      const monster = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        InitiativeModifier: 0
      });
      const companion = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "companion",
        InitiativeModifier: 0
      });

      encounter.EncounterFlow.StartEncounter();

      expect(encounter.Combatants()).toEqual([companion, monster]);
    });
  });

  test("ActiveCombatantOnTop shows player view combatants in shifted order", () => {
    InitializeTestSettings({
      PlayerView: {
        ActiveCombatantOnTop: true
      }
    });

    for (let i = 0; i < 5; i++) {
      const thisCombatant = addCombatantFromStatBlock(encounter);
      thisCombatant.Initiative(i);
    }

    encounter.EncounterFlow.StartEncounter();
    expect(encounter.GetPlayerView().Combatants[0].Id).toBe(
      encounter.EncounterFlow.ActiveCombatant().Id
    );

    for (let i = 0; i < 5; i++) {
      encounter.EncounterFlow.NextTurn(jest.fn());
      expect(encounter.GetPlayerView().Combatants[0].Id).toBe(
        encounter.EncounterFlow.ActiveCombatant().Id
      );
    }
  });

  test("Encounter turn timer stops when encounter ends", () => {
    jest.useFakeTimers();
    encounter.AddCombatantFromStatBlock({
      ...StatBlock.Default(),
      HP: { Value: 10, Notes: "" },
      Player: "player"
    });
    encounter.EncounterFlow.StartEncounter();
    jest.advanceTimersByTime(10000); // 10 seconds
    encounter.EncounterFlow.EndEncounter();
    expect(encounter.EncounterFlow.TurnTimerReadout()).toBe("0:00");
  });

  test("FlushCombatants removes all pending combatants", () => {
    const combatant1 = addCombatantFromStatBlock(encounter);
    const combatant2 = addCombatantFromStatBlock(encounter);
    const combatant3 = addCombatantFromStatBlock(encounter);

    encounter.RemoveCombatant(combatant1);
    encounter.RemoveCombatant(combatant2);

    encounter.FlushCombatants();

    expect(encounter.Combatants()).toEqual([combatant3]);
  });
});

describe("Tags", () => {
  beforeEach(() => {
    InitializeTestSettings();
  });

  test("Should appear in Player View", () => {
    const encounter = buildEncounter();
    const combatant = addCombatantFromStatBlock(encounter);
    combatant.Tags.push(new Tag("Some Tag", combatant, false));
    const playerView = encounter.GetPlayerView();
    const playerViewCombatant = playerView.Combatants[0];
    expect(playerViewCombatant.Tags).toEqual([
      {
        Text: "Some Tag",
        DurationRemaining: -1,
        DurationTiming: "StartOfTurn",
        DurationCombatantId: ""
      }
    ]);
  });

  test("Should not appear in Player View when hidden", () => {
    const encounter = buildEncounter();
    const combatant = addCombatantFromStatBlock(encounter);
    combatant.Tags.push(new Tag("Some Tag", combatant, true));
    const playerView = encounter.GetPlayerView();
    const playerViewCombatant = playerView.Combatants[0];
    expect(playerViewCombatant.Tags).toEqual([]);
  });
});

describe("MonstersActFirst", () => {
  beforeEach(() => {
    InitializeTestSettings();
  });

  test("Players sort before monsters by default, and can be swapped", () => {
    const encounter = buildEncounter();
    const monster = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Monster"
    });
    const player = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Player",
      Player: "player"
    });
    monster.Initiative(10);
    player.Initiative(10);

    encounter.SortByInitiative();
    expect(encounter.Combatants().map(c => c.StatBlock().Name)).toEqual([
      "Player",
      "Monster"
    ]);

    encounter.ToggleMonstersActFirst();

    expect(encounter.Combatants().map(c => c.StatBlock().Name)).toEqual([
      "Monster",
      "Player"
    ]);
  });

  test("Companions sort with players, not monsters", () => {
    const encounter = buildEncounter();
    const monster = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Monster"
    });
    const companion = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Companion",
      Player: "companion"
    });
    const player = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Player",
      Player: "player"
    });

    encounter.SortByPhase();
    expect(encounter.Combatants().map(c => c.StatBlock().Name)).toEqual([
      "Companion",
      "Player",
      "Monster"
    ]);

    encounter.ToggleMonstersActFirst();

    expect(encounter.Combatants().map(c => c.StatBlock().Name)).toEqual([
      "Monster",
      "Companion",
      "Player"
    ]);
  });

  test("Swapping preserves manual order within a side, even with differing initiative modifiers", () => {
    const encounter = buildEncounter();
    const player = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Player",
      Player: "player"
    });
    const slowMonster = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Slow Monster",
      InitiativeModifier: 0
    });
    const fastMonster = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Fast Monster",
      InitiativeModifier: 5
    });

    // Added in this order: Player, Slow Monster, Fast Monster.
    expect(encounter.Combatants().map(c => c.StatBlock().Name)).toEqual([
      "Player",
      "Slow Monster",
      "Fast Monster"
    ]);

    encounter.ToggleMonstersActFirst();

    // Monsters move above the player, but keep their existing relative
    // order - Fast Monster does NOT jump ahead of Slow Monster despite its
    // higher initiative modifier.
    expect(encounter.Combatants().map(c => c.StatBlock().Name)).toEqual([
      "Slow Monster",
      "Fast Monster",
      "Player"
    ]);
  });

  test("Persists across save/load", () => {
    const encounter = buildEncounter();
    encounter.ToggleMonstersActFirst();
    const encounterState = encounter.ObservableEncounterState();

    const loadedEncounter = buildEncounter();
    loadedEncounter.LoadEncounterState(encounterState, () => {}, null);

    expect(loadedEncounter.MonstersActFirst()).toBe(true);
  });
});

describe("Persistent companions", () => {
  beforeEach(() => {
    InitializeTestSettings();
  });

  test("A companion can only be added to an encounter once, same as a persistent player character", async () => {
    const encounter = buildEncounter();
    const persistentCompanion = PersistentCharacter.Initialize({
      ...StatBlock.Default(),
      Name: "Wolf",
      Player: "companion"
    });

    const firstAdd = await encounter.AddCombatantFromPersistentCharacter(
      persistentCompanion,
      () => {},
      false
    );
    const secondAdd = await encounter.AddCombatantFromPersistentCharacter(
      persistentCompanion,
      () => {},
      false
    );

    expect(firstAdd).not.toBeNull();
    expect(secondAdd).toBeNull();
    expect(encounter.Combatants().length).toBe(1);
  });

  test("A companion's current HP and Wounds sync to its PersistentCharacter, same as a player character", async () => {
    const encounter = buildEncounter();
    const persistentCompanion = PersistentCharacter.Initialize({
      ...StatBlock.Default(),
      Name: "Wolf",
      Player: "companion",
      Wounds: { Value: 5, Notes: "" }
    });
    const updatePersistentCharacter = jest.fn(async () => null);

    const companion = await encounter.AddCombatantFromPersistentCharacter(
      persistentCompanion,
      updatePersistentCharacter,
      false
    );

    companion.CurrentHP(3);
    expect(updatePersistentCharacter).toHaveBeenCalledWith(
      persistentCompanion.Id,
      { CurrentHP: 3 }
    );

    companion.ApplyWoundsChange(2);
    expect(updatePersistentCharacter).toHaveBeenCalledWith(
      persistentCompanion.Id,
      { CurrentWounds: 2 }
    );
  });
});

describe("LoadEncounterState", () => {
  test("Should load combatants in order", () => {
    const baseEncounter = buildEncounter();

    for (const initiative of [10, 5, 15]) {
      const combatant = addCombatantFromStatBlock(baseEncounter, {
        ...StatBlock.Default(),
        Name: "Initiative " + initiative
      });
      combatant.Initiative(initiative);
    }

    baseEncounter.EncounterFlow.StartEncounter();

    expect(baseEncounter.Combatants().map(c => c.Initiative())).toEqual([
      15, 10, 5
    ]);
    expect(baseEncounter.EncounterFlow.State()).toEqual("active");

    const encounterState = baseEncounter.ObservableEncounterState();
    const encounter = buildEncounter();
    encounter.LoadEncounterState(encounterState, () => {}, null);

    expect(encounter.Combatants().map(c => c.Initiative())).toEqual([
      15, 10, 5
    ]);
    expect(encounter.EncounterFlow.State()).toEqual("active");
  });
});
