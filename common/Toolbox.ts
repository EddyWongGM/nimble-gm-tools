import { escapeRegExp } from "lodash";
export function toModifierString(number: number): string {
  if (number > 0) {
    return `+${number}`;
  }
  return number.toString();
}

// Converts a raw D&D-style ability score (3-20) to its modifier, for
// content still arriving in that shape (importers, legacy saved data).
export function GetModifierFromScore(abilityScore: number): number {
  return Math.floor((abilityScore - 10) / 2);
}

export function probablyUniqueString(): string {
  //string contains only easily relayable characters for forward
  //compatability with speech-based data transfer ;-)
  const chars = "1234567890abcdefghijkmnpqrstuvxyz";
  let probablyUniqueString = "";
  for (let i = 0; i < 8; i++) {
    const index = Math.floor(Math.random() * chars.length);
    probablyUniqueString += chars[index];
  }

  return probablyUniqueString;
}

export function concatenatedStringRegex(
  strings: string[],
  options: { caseSensitive?: boolean; allowEscape?: boolean } = {}
): RegExp {
  const allStrings = strings
    .map(s => escapeRegExp(s))
    .sort((a, b) => b.length - a.length);
  if (allStrings.length === 0) {
    return new RegExp("a^");
  }
  const flags = options.caseSensitive ? "gm" : "gim";
  const alternation = allStrings.join("|");
  // allowEscape pulls a leading backslash into the same capture group as
  // the match, so callers that want a "\Name" escape hatch (e.g. to keep
  // a word from becoming a clickable reference) can detect and strip it -
  // a backslash outside the capture group would just be silently dropped
  // by react-string-replace-recursively's regex-based text.split().
  const pattern = options.allowEscape
    ? `(\\\\?\\b(?:${alternation})\\b)`
    : `\\b(${alternation})\\b`;
  return new RegExp(pattern, flags);
}

export function ParseJSONOrDefault<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

export function normalizeChallengeRating(challengeRating: number): string {
  if (challengeRating == 0.125) {
    return "1/8";
  }
  if (challengeRating == 0.25) {
    return "1/4";
  }
  if (challengeRating == 0.5) {
    return "1/2";
  }
  return challengeRating.toString();
}

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
