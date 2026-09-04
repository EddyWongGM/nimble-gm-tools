const NumericChallengePattern = /^\d+(\/\d+)?$/;

/** True for a numeric/fraction Challenge ("1", "1/2"); false for a word-based
 * one ("Minion", "Solo"). Numeric Challenge is meta-game info worth keeping
 * from players; a label like "Minion" is usually already apparent at the
 * table, so it's fine to reveal. */
export function IsNumericChallenge(challenge: string): boolean {
  return NumericChallengePattern.test(challenge.trim());
}

/**
 * A combatant's Challenge as a plain number, for encounter-difficulty math.
 * `0` for a word-based Challenge ("Minion", "Solo", ...) or an empty value -
 * those don't have a level to add to a monster/hero level total. A
 * fraction ("1/2") evaluates to its numeric value.
 */
export function GetChallengeLevel(challenge: string): number {
  if (!challenge || !IsNumericChallenge(challenge)) {
    return 0;
  }

  const [numerator, denominator] = challenge.trim().split("/").map(Number);
  return denominator ? numerator / denominator : numerator;
}

/**
 * "LV 2" for a numeric/fraction Challenge; the raw value (e.g. "Minion")
 * otherwise; null if there's no Challenge to show, or the name already
 * ends with that Challenge word (e.g. "Goblin Minion" at Challenge
 * "Minion" shouldn't become "Goblin Minion Minion"). The "name already
 * contains it" guard only applies to word-based Challenges - a numeric one
 * ("1", "2") is too likely to coincidentally match a trailing number in an
 * unrelated name (e.g. "Guard 1" at Challenge "1") to safely suppress on.
 */
export function GetChallengeSuffix(
  name: string,
  challenge: string
): string | null {
  const trimmedChallenge = challenge?.trim();
  if (!trimmedChallenge) {
    return null;
  }

  const isNumeric = IsNumericChallenge(trimmedChallenge);
  if (!isNumeric) {
    const words = name.trim().split(/\s+/);
    const lastWord = words[words.length - 1] || "";
    if (lastWord.toLowerCase() === trimmedChallenge.toLowerCase()) {
      return null;
    }
  }

  return isNumeric ? `LV ${trimmedChallenge}` : trimmedChallenge;
}
