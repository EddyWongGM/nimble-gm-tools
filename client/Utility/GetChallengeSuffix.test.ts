import { GetChallengeSuffix, IsNumericChallenge } from "./GetChallengeSuffix";

describe("IsNumericChallenge", () => {
  test("numeric and fraction Challenges are numeric", () => {
    expect(IsNumericChallenge("1")).toBe(true);
    expect(IsNumericChallenge("1/2")).toBe(true);
  });

  test("word-based Challenges are not numeric", () => {
    expect(IsNumericChallenge("Minion")).toBe(false);
  });

  test("tolerates surrounding whitespace", () => {
    expect(IsNumericChallenge(" 1 ")).toBe(true);
    expect(IsNumericChallenge("1/2 ")).toBe(true);
  });
});

describe("GetChallengeSuffix", () => {
  test("formats a numeric/fraction Challenge as 'LV n'", () => {
    expect(GetChallengeSuffix("Goblin", "1/2")).toBe("LV 1/2");
  });

  test("uses the raw value for a word-based Challenge", () => {
    expect(GetChallengeSuffix("Goblin", "Minion")).toBe("Minion");
  });

  test("returns null when the name already ends with the word-based Challenge", () => {
    expect(GetChallengeSuffix("Goblin Minion", "Minion")).toBeNull();
  });

  test("does not suppress a numeric Challenge that coincidentally matches a trailing number in the name", () => {
    expect(GetChallengeSuffix("Guard 1", "1")).toBe("LV 1");
  });

  test("tolerates surrounding whitespace on the Challenge value", () => {
    expect(GetChallengeSuffix("Goblin", " 1/2 ")).toBe("LV 1/2");
    expect(GetChallengeSuffix("Goblin Minion", " Minion ")).toBeNull();
  });

  test("returns null when there is no Challenge", () => {
    expect(GetChallengeSuffix("Goblin", "")).toBeNull();
  });
});
