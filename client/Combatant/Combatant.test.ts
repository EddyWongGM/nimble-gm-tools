import { PersistentCharacter } from "../../common/PersistentCharacter";
import { StatBlock } from "../../common/StatBlock";
import { Encounter } from "../Encounter/Encounter";
import { InitializeTestSettings } from "../test/InitializeTestSettings";
import { addCombatantFromStatBlock } from "../test/addCombatant";
import { buildEncounter } from "../test/buildEncounter";
import { Tag } from "./Tag";
import { ToPlayerViewCombatantState } from "./ToPlayerViewCombatantState";

describe("Combatant", () => {
  let encounter: Encounter;
  beforeEach(() => {
    InitializeTestSettings();
    encounter = buildEncounter();
  });

  test("Should have its Max HP set from the statblock", () => {
    const combatant = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      HP: { Value: 10, Notes: "" }
    });

    expect(combatant.MaxHP()).toBe(10);
  });

  test("Should update its Max HP when its statblock is updated", () => {
    const combatant = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Player: "player"
    });

    combatant.StatBlock({
      ...StatBlock.Default(),
      HP: { Value: 15, Notes: "" }
    });
    expect(combatant.MaxHP()).toBe(15);
  });

  test("Should notify the encounter when its statblock is updated", () => {
    const combatant = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Player: "player"
    });
    const combatantsSpy = jest.fn();
    encounter.Combatants.subscribe(combatantsSpy);

    combatant.StatBlock({
      ...StatBlock.Default(),
      HP: { Value: 15, Notes: "" }
    });
    expect(combatantsSpy).toBeCalled();
  });

  describe("Temporary resource pools", () => {
    test("ApplyTemporaryMana does not stack, takes the higher value", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Mana: { Value: 10, Notes: "" }
      });

      combatant.ApplyTemporaryMana(5);
      combatant.ApplyTemporaryMana(3);
      expect(combatant.TemporaryMana()).toBe(5);

      combatant.ApplyTemporaryMana(8);
      expect(combatant.TemporaryMana()).toBe(8);
    });

    test("ApplyManaChange spends from TemporaryMana first, then spills over", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Mana: { Value: 10, Notes: "" }
      });
      combatant.CurrentMana(10);
      combatant.ApplyTemporaryMana(5);

      combatant.ApplyManaChange(3);
      expect(combatant.TemporaryMana()).toBe(2);
      expect(combatant.CurrentMana()).toBe(10);

      combatant.ApplyManaChange(6);
      expect(combatant.TemporaryMana()).toBe(0);
      expect(combatant.CurrentMana()).toBe(6);
    });

    test("ApplyManaChange restoring mana does not touch TemporaryMana", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Mana: { Value: 10, Notes: "" }
      });
      combatant.CurrentMana(4);
      combatant.ApplyTemporaryMana(5);

      combatant.ApplyManaChange(-3);
      expect(combatant.TemporaryMana()).toBe(5);
      expect(combatant.CurrentMana()).toBe(7);
    });

    test("ApplyWoundsChange absorbs incoming wounds into TemporaryWounds before CurrentWounds rises", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player",
        Wounds: { Value: 5, Notes: "" }
      });
      combatant.ApplyTemporaryWounds(3);

      combatant.ApplyWoundsChange(2);
      expect(combatant.TemporaryWounds()).toBe(1);
      expect(combatant.CurrentWounds()).toBe(0);

      combatant.ApplyWoundsChange(2);
      expect(combatant.TemporaryWounds()).toBe(0);
      expect(combatant.CurrentWounds()).toBe(1);
    });

    test("ApplyManaChange clamps at MaxMana when restoring beyond full", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Mana: { Value: 10, Notes: "" }
      });
      combatant.CurrentMana(8);

      combatant.ApplyManaChange(-100);

      expect(combatant.CurrentMana()).toBe(10);
    });

    test("ApplyResourcesChange spends from TemporaryResources first, then spills over", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Resources: { Value: 10, Notes: "" }
      });
      combatant.CurrentResources(10);
      combatant.ApplyTemporaryResources(5);

      combatant.ApplyResourcesChange(3);
      expect(combatant.TemporaryResources()).toBe(2);
      expect(combatant.CurrentResources()).toBe(10);

      combatant.ApplyResourcesChange(6);
      expect(combatant.TemporaryResources()).toBe(0);
      expect(combatant.CurrentResources()).toBe(6);
    });

    test("ApplyResourcesChange restoring resources does not touch TemporaryResources, and clamps at max", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Resources: { Value: 10, Notes: "" }
      });
      combatant.CurrentResources(4);
      combatant.ApplyTemporaryResources(5);

      combatant.ApplyResourcesChange(-3);
      expect(combatant.TemporaryResources()).toBe(5);
      expect(combatant.CurrentResources()).toBe(7);

      combatant.ApplyResourcesChange(-100);
      expect(combatant.CurrentResources()).toBe(10);
    });

    test("ApplyHitDiceChange spends from TemporaryHitDice first, then spills over, and clamps at 0", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player",
        HitDice: { Value: 4, Notes: "" }
      });
      combatant.CurrentHitDice(4);
      combatant.ApplyTemporaryHitDice(2);

      combatant.ApplyHitDiceChange(1);
      expect(combatant.TemporaryHitDice()).toBe(1);
      expect(combatant.CurrentHitDice()).toBe(4);

      combatant.ApplyHitDiceChange(100);
      expect(combatant.TemporaryHitDice()).toBe(0);
      expect(combatant.CurrentHitDice()).toBe(0);
    });

    test("ApplyHitDiceChange restoring hit dice does not touch TemporaryHitDice", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player",
        HitDice: { Value: 4, Notes: "" }
      });
      combatant.CurrentHitDice(1);
      combatant.ApplyTemporaryHitDice(2);

      combatant.ApplyHitDiceChange(-1);
      expect(combatant.TemporaryHitDice()).toBe(2);
      expect(combatant.CurrentHitDice()).toBe(2);
    });

    test("ApplyGoldChange: a positive amount adds gold (opposite sign convention from Mana/Resources/Hit Dice)", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });
      combatant.CurrentGold(10);

      combatant.ApplyGoldChange(5);

      expect(combatant.CurrentGold()).toBe(15);
    });

    test("ApplyGoldChange: a negative amount subtracts gold, floored at 0 with no ceiling", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });
      combatant.CurrentGold(10);

      combatant.ApplyGoldChange(-3);
      expect(combatant.CurrentGold()).toBe(7);

      combatant.ApplyGoldChange(-100);
      expect(combatant.CurrentGold()).toBe(0);

      combatant.ApplyGoldChange(100000);
      expect(combatant.CurrentGold()).toBe(100000);
    });
  });

  describe("Inventory", () => {
    test("MaxInventorySlots is 10 plus the Strength modifier", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Abilities: { ...StatBlock.Default().Abilities, Str: 0 }
      });
      expect(combatant.MaxInventorySlots()).toBe(10);

      combatant.StatBlock({
        ...StatBlock.Default(),
        Abilities: { ...StatBlock.Default().Abilities, Str: 2 }
      });
      expect(combatant.MaxInventorySlots()).toBe(12);

      combatant.StatBlock({
        ...StatBlock.Default(),
        Abilities: { ...StatBlock.Default().Abilities, Str: -2 }
      });
      expect(combatant.MaxInventorySlots()).toBe(8);
    });

    test("ApplyItemChange creates a new stackable item, and further calls merge into it instead of duplicating", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });

      combatant.ApplyItemChange("Torch", true, 4, 1);
      expect(combatant.Items()).toEqual([
        { Name: "Torch", Stackable: true, Quantity: 4, SlotCost: 1 }
      ]);

      combatant.ApplyItemChange("Torch", true, 3, 1);
      expect(combatant.Items()).toEqual([
        { Name: "Torch", Stackable: true, Quantity: 7, SlotCost: 1 }
      ]);
    });

    test("ApplyItemChange removes a stackable item once its quantity reaches zero", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });

      combatant.ApplyItemChange("Torch", true, 2, 1);
      combatant.ApplyItemChange("Torch", true, -2, 1);

      expect(combatant.Items()).toEqual([]);
    });

    test("ApplyItemChange with stackable=false always adds a separate row", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });

      combatant.ApplyItemChange("Bedroll", false, 1, 2);
      combatant.ApplyItemChange("Bedroll", false, 1, 2);

      expect(combatant.Items()).toEqual([
        { Name: "Bedroll", Stackable: false, Quantity: 1, SlotCost: 2 },
        { Name: "Bedroll", Stackable: false, Quantity: 1, SlotCost: 2 }
      ]);
    });

    test("InventorySlotsUsed sums SlotCost per row - a stack costs 1 slot regardless of quantity", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });

      combatant.ApplyItemChange("Torch", true, 40, 1);
      combatant.ApplyItemChange("Bedroll", false, 1, 2);

      expect(combatant.InventorySlotsUsed()).toBe(3);
    });

    test("RemoveItem removes exactly the row passed in", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });

      combatant.ApplyItemChange("Torch", true, 4, 1);
      combatant.ApplyItemChange("Bedroll", false, 1, 2);
      const torch = combatant.Items()[0];

      combatant.RemoveItem(torch);

      expect(combatant.Items()).toEqual([
        { Name: "Bedroll", Stackable: false, Quantity: 1, SlotCost: 2 }
      ]);
    });
  });

  describe("Persistent tags for player characters", () => {
    test("Only non-duration tags sync to the PersistentCharacter", async () => {
      const persistentCharacter = PersistentCharacter.Initialize({
        ...StatBlock.Default(),
        Player: "player"
      });
      const updatePersistentCharacter = jest.fn(async () => null);
      const combatant = await encounter.AddCombatantFromPersistentCharacter(
        persistentCharacter,
        updatePersistentCharacter,
        false
      );

      combatant.Tags.push(new Tag("Cursed by the Baron", combatant, false));
      combatant.Tags.push(new Tag("Poisoned", combatant, false, 3));

      expect(updatePersistentCharacter).toHaveBeenLastCalledWith(
        persistentCharacter.Id,
        {
          Tags: [expect.objectContaining({ Text: "Cursed by the Baron" })]
        }
      );
    });

    test("Items sync to the PersistentCharacter", async () => {
      const persistentCharacter = PersistentCharacter.Initialize({
        ...StatBlock.Default(),
        Player: "player"
      });
      const updatePersistentCharacter = jest.fn(async () => null);
      const combatant = await encounter.AddCombatantFromPersistentCharacter(
        persistentCharacter,
        updatePersistentCharacter,
        false
      );

      combatant.ApplyItemChange("Torch", true, 4, 1);

      expect(updatePersistentCharacter).toHaveBeenLastCalledWith(
        persistentCharacter.Id,
        {
          Items: [{ Name: "Torch", Stackable: true, Quantity: 4, SlotCost: 1 }]
        }
      );
    });
  });

  describe("ToPlayerViewCombatantState", () => {
    test("Should show full HP for player characters", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });
      const playerViewCombatantState = ToPlayerViewCombatantState(combatant);
      expect(playerViewCombatantState.HPDisplay).toEqual("1/1");
    });

    test("Should show qualitative HP for creatures", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default()
      });
      const playerViewCombatantState = ToPlayerViewCombatantState(combatant);
      expect(playerViewCombatantState.HPDisplay).toEqual(
        "<span class='healthyHP'>Healthy</span>"
      );
    });

    test("AC is revealed for a player character once RevealedAC is set", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player",
        AC: { Value: 15, Notes: "" }
      });
      combatant.RevealedAC(true);
      expect(ToPlayerViewCombatantState(combatant).AC).toBe(15);
    });

    test("AC is never revealed for a monster, even if RevealedAC is set", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        AC: { Value: 15, Notes: "" }
      });
      combatant.RevealedAC(true);
      expect(ToPlayerViewCombatantState(combatant).AC).toBeUndefined();
    });

    test("ManaDisplay is undefined when the statblock has no Mana", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });
      expect(ToPlayerViewCombatantState(combatant).ManaDisplay).toBeUndefined();
    });

    test("ManaDisplay shows only the current value to players (max is DM-only)", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player",
        Mana: { Value: 10, Notes: "" }
      });
      combatant.CurrentMana(6);
      expect(ToPlayerViewCombatantState(combatant).ManaDisplay).toEqual("6");
    });

    test("ManaDisplay shows a qualitative label for monsters, using MonsterHPVerbosity", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Mana: { Value: 10, Notes: "" }
      });
      combatant.CurrentMana(10);
      expect(ToPlayerViewCombatantState(combatant).ManaDisplay).toEqual(
        "<span class='healthyHP'>Full</span>"
      );
    });

    test("HitDiceDisplay is undefined for a monster, even if its statblock has Hit Dice", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        HitDice: { Value: 2, Notes: "" }
      });
      expect(
        ToPlayerViewCombatantState(combatant).HitDiceDisplay
      ).toBeUndefined();
    });

    test("HitDiceDisplay is undefined for a player character while Hit Dice are still full", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player",
        HitDice: { Value: 2, Notes: "" }
      });
      expect(
        ToPlayerViewCombatantState(combatant).HitDiceDisplay
      ).toBeUndefined();
    });

    test("HitDiceDisplay shows once at least one Hit Die is spent", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player",
        HitDice: { Value: 2, Notes: "" }
      });
      combatant.ApplyHitDiceChange(1);
      expect(ToPlayerViewCombatantState(combatant).HitDiceDisplay).toEqual(
        "1"
      );
    });

    test("HitDiceDisplay is undefined when RevealedHitDice is locked off, even with Hit Dice spent", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player",
        HitDice: { Value: 2, Notes: "" }
      });
      combatant.ApplyHitDiceChange(1);
      combatant.RevealedHitDice(false);
      expect(
        ToPlayerViewCombatantState(combatant).HitDiceDisplay
      ).toBeUndefined();
    });

    test("WoundsDisplay is undefined for a monster, even if its statblock has Wounds", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Wounds: { Value: 5, Notes: "" }
      });
      expect(
        ToPlayerViewCombatantState(combatant).WoundsDisplay
      ).toBeUndefined();
    });

    test("WoundsDisplay is undefined for an untouched player character (hidden until first wound)", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player",
        Wounds: { Value: 5, Notes: "" }
      });
      expect(
        ToPlayerViewCombatantState(combatant).WoundsDisplay
      ).toBeUndefined();
    });

    test("WoundsDisplay shows the current value once a wound is taken", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player",
        Wounds: { Value: 5, Notes: "" }
      });
      combatant.ApplyWoundsChange(2);
      expect(ToPlayerViewCombatantState(combatant).WoundsDisplay).toEqual("2");
    });

    test("A companion tracks Wounds the same as a player character", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "companion",
        Wounds: { Value: 5, Notes: "" }
      });

      expect(combatant.MaxWounds()).toBe(5);
      expect(
        ToPlayerViewCombatantState(combatant).WoundsDisplay
      ).toBeUndefined();

      combatant.ApplyWoundsChange(2);
      expect(ToPlayerViewCombatantState(combatant).WoundsDisplay).toEqual("2");
    });

    test("GoldDisplay is undefined for a monster", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default()
      });
      combatant.CurrentGold(50);
      expect(ToPlayerViewCombatantState(combatant).GoldDisplay).toBeUndefined();
    });

    test("GoldDisplay is undefined for a player character when gold is hidden from players", () => {
      InitializeTestSettings({
        Rules: { EnableGold: true },
        PlayerView: { HideGoldNumbers: true }
      });
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });
      combatant.CurrentGold(50);
      expect(ToPlayerViewCombatantState(combatant).GoldDisplay).toBeUndefined();
    });

    test("GoldDisplay shows for a player character's gold", () => {
      InitializeTestSettings({ Rules: { EnableGold: true } });
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });
      combatant.CurrentGold(50);
      expect(ToPlayerViewCombatantState(combatant).GoldDisplay).toEqual("50");
    });

    test("InventoryDisplay is undefined for a monster", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default()
      });
      combatant.ApplyItemChange("Torch", true, 1, 1);
      expect(
        ToPlayerViewCombatantState(combatant).InventoryDisplay
      ).toBeUndefined();
    });

    test("InventoryDisplay is undefined for a player character when inventory is hidden from players", () => {
      InitializeTestSettings({
        Rules: { EnableInventory: true },
        PlayerView: { HideInventoryNumbers: true }
      });
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });
      combatant.ApplyItemChange("Torch", true, 1, 1);
      expect(
        ToPlayerViewCombatantState(combatant).InventoryDisplay
      ).toBeUndefined();
    });

    test("InventoryDisplay shows slots used over max for a player character's inventory", () => {
      InitializeTestSettings({ Rules: { EnableInventory: true } });
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });
      combatant.ApplyItemChange("Torch", true, 1, 1);
      combatant.ApplyItemChange("Bedroll", false, 1, 2);

      expect(ToPlayerViewCombatantState(combatant).InventoryDisplay).toEqual(
        "3/10"
      );
      expect(ToPlayerViewCombatantState(combatant).InventoryColor).toEqual(
        "var(--parchment)"
      );
    });

    test("InventoryColor turns warning-red once slots used exceeds MaxInventorySlots", () => {
      InitializeTestSettings({ Rules: { EnableInventory: true } });
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "player"
      });
      for (let i = 0; i < 11; i++) {
        combatant.ApplyItemChange(`Item ${i}`, false, 1, 1);
      }

      expect(ToPlayerViewCombatantState(combatant).InventoryColor).toEqual(
        "rgb(200,30,30)"
      );
    });

    test("IndexLabel is not forced onto a companion by AlwaysNumberMonsters, same as a player character", () => {
      InitializeTestSettings({ Rules: { AlwaysNumberMonsters: true } });
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Name: "Wolf",
        Player: "companion"
      });
      expect(ToPlayerViewCombatantState(combatant).IndexLabel).toBeUndefined();
    });
  });

  describe("Legendary last stand", () => {
    test("ApplyDamage drops a Legendary monster to its Last Stand HP instead of defeating it, the first time it hits 0", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "legendary",
        HP: { Value: 10, Notes: "" },
        LastStandHP: { Value: 4, Notes: "" }
      });

      combatant.ApplyDamage(10);

      expect(combatant.CurrentHP()).toBe(4);
      expect(combatant.HasEnteredLastStand()).toBe(true);
      expect(combatant.Tags().map(t => t.Text)).toContain("Last Stand");
    });

    test("ApplyDamage defeats a Legendary monster normally the second time it hits 0", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "legendary",
        HP: { Value: 10, Notes: "" },
        LastStandHP: { Value: 4, Notes: "" }
      });

      combatant.ApplyDamage(10);
      combatant.ApplyDamage(4);

      expect(combatant.CurrentHP()).toBe(0);
      expect(combatant.HasEnteredLastStand()).toBe(true);
    });

    test("ApplyDamage does not trigger a last stand without an authored Last Stand HP", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        Player: "legendary",
        HP: { Value: 10, Notes: "" }
      });

      combatant.ApplyDamage(10);

      expect(combatant.CurrentHP()).toBe(0);
      expect(combatant.HasEnteredLastStand()).toBe(false);
    });

    test("ApplyDamage does not trigger a last stand for a non-Legendary monster", () => {
      const combatant = addCombatantFromStatBlock(encounter, {
        ...StatBlock.Default(),
        HP: { Value: 10, Notes: "" },
        LastStandHP: { Value: 4, Notes: "" }
      });

      combatant.ApplyDamage(10);

      expect(combatant.CurrentHP()).toBe(0);
      expect(combatant.HasEnteredLastStand()).toBe(false);
    });
  });
});
