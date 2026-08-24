import { Combatant } from "../Combatant/Combatant";
import { ItemModel, submitItemPrompt } from "./ItemPrompt";

function mockCombatant(): Combatant {
  return { ApplyItemChange: jest.fn() } as unknown as Combatant;
}

function baseModel(overrides: Partial<ItemModel> = {}): ItemModel {
  return {
    itemName: "Torch",
    stackable: false,
    quantity: "1",
    slotCost: "1",
    showInventoryCard: false,
    ...overrides
  };
}

describe("submitItemPrompt", () => {
  test("shows the inventory card and skips adding an item when showInventoryCard is set", () => {
    const combatant = mockCombatant();
    const logEvent = jest.fn();
    const onShowInventoryCard = jest.fn();

    const result = submitItemPrompt(
      baseModel({ showInventoryCard: true }),
      [combatant],
      "Andric",
      logEvent,
      onShowInventoryCard
    );

    expect(onShowInventoryCard).toHaveBeenCalledTimes(1);
    expect(combatant.ApplyItemChange).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test("does nothing when the item name is blank", () => {
    const combatant = mockCombatant();
    const logEvent = jest.fn();

    const result = submitItemPrompt(
      baseModel({ itemName: "   " }),
      [combatant],
      "Andric",
      logEvent
    );

    expect(combatant.ApplyItemChange).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test("adds a non-stackable item with its slot cost and logs it", () => {
    const combatant = mockCombatant();
    const logEvent = jest.fn();

    submitItemPrompt(
      baseModel({ itemName: "Shield", slotCost: "2" }),
      [combatant],
      "Andric",
      logEvent
    );

    expect(combatant.ApplyItemChange).toHaveBeenCalledWith(
      "Shield",
      false,
      0,
      2
    );
    expect(logEvent).toHaveBeenCalledWith("Added Shield for Andric.");
  });

  test("defaults a non-numeric slot cost to 1", () => {
    const combatant = mockCombatant();

    submitItemPrompt(
      baseModel({ itemName: "Shield", slotCost: "not-a-number" }),
      [combatant],
      "Andric",
      jest.fn()
    );

    expect(combatant.ApplyItemChange).toHaveBeenCalledWith(
      "Shield",
      false,
      0,
      1
    );
  });

  test("adds a positive quantity of a stackable item and logs it as Added", () => {
    const combatant = mockCombatant();
    const logEvent = jest.fn();

    submitItemPrompt(
      baseModel({ stackable: true, quantity: "3" }),
      [combatant],
      "Andric",
      logEvent
    );

    expect(combatant.ApplyItemChange).toHaveBeenCalledWith(
      "Torch",
      true,
      3,
      1
    );
    expect(logEvent).toHaveBeenCalledWith("Added 3 Torch for Andric.");
  });

  test("removes a negative quantity of a stackable item and logs it as Removed", () => {
    const combatant = mockCombatant();
    const logEvent = jest.fn();

    submitItemPrompt(
      baseModel({ stackable: true, quantity: "-2" }),
      [combatant],
      "Andric",
      logEvent
    );

    expect(combatant.ApplyItemChange).toHaveBeenCalledWith(
      "Torch",
      true,
      -2,
      1
    );
    expect(logEvent).toHaveBeenCalledWith("Removed 2 Torch for Andric.");
  });

  test("does nothing for a stackable item with a zero or invalid quantity", () => {
    const combatant = mockCombatant();
    const logEvent = jest.fn();

    submitItemPrompt(
      baseModel({ stackable: true, quantity: "0" }),
      [combatant],
      "Andric",
      logEvent
    );
    submitItemPrompt(
      baseModel({ stackable: true, quantity: "not-a-number" }),
      [combatant],
      "Andric",
      logEvent
    );

    expect(combatant.ApplyItemChange).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
  });

  test("applies the change to every targeted combatant", () => {
    const combatants = [mockCombatant(), mockCombatant(), mockCombatant()];

    submitItemPrompt(baseModel(), combatants, "Andric, Bryndor, Mikal", jest.fn());

    combatants.forEach(combatant => {
      expect(combatant.ApplyItemChange).toHaveBeenCalledWith(
        "Torch",
        false,
        0,
        1
      );
    });
  });
});
