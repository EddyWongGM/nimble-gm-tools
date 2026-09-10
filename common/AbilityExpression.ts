import { AbilityScores } from "./StatBlock";

// Shared grammar for a small class of stat block expressions - "[Dex]",
// "2×[Wil]", "[Dex]+[LVL]", "2×[Wil]+[LVL]" - used both inline in
// Content/Description text (TextEnricher) and in an ability's Usage field
// (StatBlock.ParseChargeUsage), so both places resolve the same syntax the
// same way.

export type AbilityExpressionAbility = keyof AbilityScores | "LVL";

export interface AbilityExpressionTerm {
  coefficient: number;
  ability: AbilityExpressionAbility | null; // null = plain number term
}

// "Wil" is Nimble's display name for the Wis field - see
// StatBlock.AbilityDisplayNames.
const ABILITY_ALIASES: Record<string, keyof AbilityScores> = {
  str: "Str",
  dex: "Dex",
  int: "Int",
  wis: "Wis",
  wil: "Wis"
};

const ABILITY_DISPLAY_NAMES: Record<AbilityExpressionAbility, string> = {
  Str: "STR",
  Dex: "DEX",
  Int: "INT",
  Wis: "WIL",
  LVL: "LVL"
};

const TERM_TOKEN = "Str|Dex|Int|Wis|Wil|LVL";
const PLAIN_TERM = /^(\d+)$/;
const ABILITY_TERM = new RegExp(`^\\[(${TERM_TOKEN})\\]$`, "i");
const MULTIPLIED_TERM = new RegExp(
  `^(\\d+)\\s*[×x]\\s*\\[(${TERM_TOKEN})\\]$`,
  "i"
);

function normalizeAbility(raw: string): AbilityExpressionAbility {
  return raw.toUpperCase() === "LVL" ? "LVL" : ABILITY_ALIASES[raw.toLowerCase()];
}

// Parses a whole expression made of one or more "+"-joined terms, each a
// plain number, a bare "[Ability]"/"[LVL]" tag, or a number times such a
// tag ("2×[Wil]"). Returns null if any term doesn't fit that shape, so a
// caller can fall back to treating the text as an unrecognized plain
// string rather than guessing.
export function ParseAbilityExpression(
  expression: string
): AbilityExpressionTerm[] | null {
  const parts = expression.split("+").map(part => part.trim());
  if (parts.some(part => part.length === 0)) {
    return null;
  }
  const terms: AbilityExpressionTerm[] = [];
  for (const part of parts) {
    const plain = part.match(PLAIN_TERM);
    if (plain) {
      terms.push({ coefficient: parseInt(plain[1]), ability: null });
      continue;
    }
    const abilityOnly = part.match(ABILITY_TERM);
    if (abilityOnly) {
      terms.push({ coefficient: 1, ability: normalizeAbility(abilityOnly[1]) });
      continue;
    }
    const multiplied = part.match(MULTIPLIED_TERM);
    if (multiplied) {
      terms.push({
        coefficient: parseInt(multiplied[1]),
        ability: normalizeAbility(multiplied[2])
      });
      continue;
    }
    return null;
  }
  return terms;
}

// Resolves parsed terms to a number. An ability term needs `abilities`; a
// LVL term needs `level`; either missing leaves the whole expression
// unresolved (null) rather than silently treating it as 0 - same fallback
// a single [Dex]/[LVL] tag already uses when there's no stat block behind
// it (e.g. the read-only Library view).
export function EvaluateAbilityExpression(
  terms: AbilityExpressionTerm[],
  abilities: AbilityScores | undefined,
  level: number | undefined
): number | null {
  let total = 0;
  for (const term of terms) {
    if (term.ability === null) {
      total += term.coefficient;
    } else if (term.ability === "LVL") {
      if (level === undefined) {
        return null;
      }
      total += term.coefficient * level;
    } else {
      if (!abilities) {
        return null;
      }
      total += term.coefficient * abilities[term.ability];
    }
  }
  return total;
}

// A canonical label for a parsed expression, e.g. "2 x [wil]+[lvl]" and
// "2×[Wil] + [LVL]" both normalize to "2×WIL+LVL" - used as the small
// caption under the rolled total.
export function FormatAbilityExpressionLabel(
  terms: AbilityExpressionTerm[]
): string {
  return terms
    .map(term => {
      if (term.ability === null) {
        return `${term.coefficient}`;
      }
      const name = ABILITY_DISPLAY_NAMES[term.ability];
      return term.coefficient === 1 ? name : `${term.coefficient}×${name}`;
    })
    .join("+");
}

// Matches a whole compound expression in free text: either two or more
// terms joined by "+", or a single multiplied term ("2×[Wil]"). A bare
// single tag ("[Wil]") is deliberately excluded - that's already handled
// as a plain ability tag by TextEnricher.
const TERM_PATTERN = `(?:\\d+\\s*[×x]\\s*)?\\[(?:${TERM_TOKEN})\\]`;
export const AbilityExpressionPattern = new RegExp(
  `((?:${TERM_PATTERN})(?:\\s*\\+\\s*(?:${TERM_PATTERN}))+|\\d+\\s*[×x]\\s*\\[(?:${TERM_TOKEN})\\])`,
  "gi"
);
