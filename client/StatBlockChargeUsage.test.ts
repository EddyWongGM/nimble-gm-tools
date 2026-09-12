import { StatBlock } from "../common/StatBlock";

describe("StatBlock.ParseChargeUsage", () => {
  test.each([
    ["2/Safe Rest", { Max: 2, ResetOn: "safe-rest" }],
    ["1/safe rest", { Max: 1, ResetOn: "safe-rest" }],
    ["  3 / Safe Rest  ", { Max: 3, ResetOn: "safe-rest" }],
    ["1/Encounter", { Max: 1, ResetOn: "encounter" }],
    ["4/encounter", { Max: 4, ResetOn: "encounter" }]
  ])("parses %s", (usage, expected) => {
    expect(StatBlock.ParseChargeUsage(usage)).toEqual(expected);
  });

  test.each([
    [undefined],
    [""],
    ["Recharge 5-6"],
    ["1/Battle"],
    ["Once per long rest"]
  ])("does not match %s", usage => {
    expect(StatBlock.ParseChargeUsage(usage)).toBeNull();
  });

  const abilities = { Str: 0, Dex: 3, Int: 0, Wis: -1 };

  test.each([
    ["[Dex]/Safe Rest", { Max: 3, ResetOn: "safe-rest" }],
    ["[dex]/safe rest", { Max: 3, ResetOn: "safe-rest" }],
    ["[Wil]/Encounter", { Max: 0, ResetOn: "encounter" }], // Wis -1 clamps to 0
    ["2×[Dex]/Safe Rest", { Max: 6, ResetOn: "safe-rest" }],
    ["2x[Dex]/Encounter", { Max: 6, ResetOn: "encounter" }],
    ["2 × [Dex] / Safe Rest", { Max: 6, ResetOn: "safe-rest" }]
  ])("resolves %s against the combatant's Abilities", (usage, expected) => {
    expect(StatBlock.ParseChargeUsage(usage, abilities)).toEqual(expected);
  });

  test.each([["[Dex]/Safe Rest"], ["2×[Wil]/Encounter"]])(
    "does not resolve %s without Abilities",
    usage => {
      expect(StatBlock.ParseChargeUsage(usage)).toBeNull();
    }
  );

  test.each([
    ["[Dex]+[LVL]/Safe Rest", { Max: 5, ResetOn: "safe-rest" }],
    ["2×[Wil]+[LVL]/Encounter", { Max: 0, ResetOn: "encounter" }], // 2×-1 + 2, clamped to 0
    ["[LVL]/Safe Rest", { Max: 2, ResetOn: "safe-rest" }]
  ])(
    "resolves %s against the combatant's Abilities and level",
    (usage, expected) => {
      expect(StatBlock.ParseChargeUsage(usage, abilities, 2)).toEqual(
        expected
      );
    }
  );

  test("does not resolve a LVL-based expression without a level", () => {
    expect(
      StatBlock.ParseChargeUsage("[Dex]+[LVL]/Safe Rest", abilities)
    ).toBeNull();
  });
});

describe("StatBlock.ClearAbilityCharges", () => {
  const statBlock: StatBlock = {
    ...StatBlock.Default(),
    Actions: [
      { Name: "Fireball", Content: "", Usage: "1/Safe Rest" },
      { Name: "Second Wind", Content: "", Usage: "1/Encounter" },
      { Name: "Bite", Content: "", Usage: "" }
    ]
  };

  test("clears only charges matching the given trigger", () => {
    const used = { Fireball: 1, "Second Wind": 1 };
    expect(StatBlock.ClearAbilityCharges(used, statBlock, "safe-rest")).toEqual(
      { "Second Wind": 1 }
    );
    expect(StatBlock.ClearAbilityCharges(used, statBlock, "encounter")).toEqual(
      { Fireball: 1 }
    );
  });

  test("leaves entries for abilities with no charge Usage untouched", () => {
    const used = { Bite: 2 };
    expect(StatBlock.ClearAbilityCharges(used, statBlock, "safe-rest")).toEqual(
      used
    );
  });

  test("returns an empty object as-is", () => {
    expect(StatBlock.ClearAbilityCharges({}, statBlock, "safe-rest")).toEqual(
      {}
    );
  });

  test("treats an undefined map as empty", () => {
    expect(
      StatBlock.ClearAbilityCharges(undefined, statBlock, "safe-rest")
    ).toEqual({});
  });
});
