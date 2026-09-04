import {
  DifficultyCalculator,
  FormatEncounterDifficulty,
  GetEncounterDifficultyTooltip
} from "./DifficultyCalculator";

describe("Encounter Difficulty Calculator", () => {
  it("returns no tier when there are no heroes", () => {
    const difficulty = DifficultyCalculator.Calculate(["4"], []);
    expect(difficulty.Tier).toBe("");
    expect(difficulty.MonsterLevelTotal).toBe(4);
    expect(difficulty.HeroLevelTotal).toBe(0);
  });

  it("excludes minions and other non-numeric Challenges from the monster total", () => {
    const difficulty = DifficultyCalculator.Calculate(
      ["4", "Minion", "Solo"],
      ["4"]
    );
    expect(difficulty.MonsterLevelTotal).toBe(4);
  });

  it("sums fractional Challenges", () => {
    const difficulty = DifficultyCalculator.Calculate(["1/2", "1/2"], ["2"]);
    expect(difficulty.MonsterLevelTotal).toBe(1);
  });

  // Boundaries at 62.5/87.5/112.5/137.5% of a 100-level hero total.
  it.each([
    [61, "Easy"],
    [62, "Easy"],
    [63, "Medium"],
    [87, "Medium"],
    [88, "Hard"],
    [100, "Hard"],
    [112, "Hard"],
    [113, "Deadly"],
    [137, "Deadly"],
    [138, "Very Deadly"],
    [200, "Very Deadly"]
  ])("monster total %i vs hero total 100 is %s", (monsterLevel, tier) => {
    const difficulty = DifficultyCalculator.Calculate(
      [monsterLevel.toString()],
      ["100"]
    );
    expect(difficulty.Tier).toBe(tier);
  });

  it("compares a Legendary/Titan monster's level against the average hero level", () => {
    const difficulty = DifficultyCalculator.Calculate(
      [],
      ["3", "5"],
      "4"
    );
    expect(difficulty.Tier).toBe("Hard");
    expect(difficulty.MonsterLevelTotal).toBe(4);
    expect(difficulty.HeroLevelTotal).toBe(8);
  });

  it("returns no tier for a Legendary/Titan monster when there are no heroes", () => {
    const difficulty = DifficultyCalculator.Calculate([], [], "4");
    expect(difficulty.Tier).toBe("");
  });
});

describe("FormatEncounterDifficulty", () => {
  it("shows hero total first, then monster total (heroes are typically added first)", () => {
    const difficulty = DifficultyCalculator.Calculate(
      [],
      ["1", "1", "1", "1"]
    );
    expect(FormatEncounterDifficulty(difficulty)).toBe("Easy 4/0");
  });

  it("shows just the monster total when there's no tier", () => {
    const difficulty = DifficultyCalculator.Calculate(["4"], []);
    expect(FormatEncounterDifficulty(difficulty)).toBe("4");
  });
});

describe("GetEncounterDifficultyTooltip", () => {
  it("includes both totals and the tier's rulebook description", () => {
    const difficulty = DifficultyCalculator.Calculate(["4"], ["4"]);
    expect(GetEncounterDifficultyTooltip(difficulty)).toBe(
      "Heroes: 4, Monsters: 4 — Heroes must use significant resources; some may drop to 0 HP, but none should die barring poor tactics or bad luck."
    );
  });

  it("omits the description when there's no tier", () => {
    const difficulty = DifficultyCalculator.Calculate(["4"], []);
    expect(GetEncounterDifficultyTooltip(difficulty)).toBe(
      "Heroes: 0, Monsters: 4"
    );
  });
});
