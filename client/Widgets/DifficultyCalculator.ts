import { GetChallengeLevel } from "../Utility/GetChallengeSuffix";

export type EncounterDifficultyTier =
  | ""
  | "Easy"
  | "Medium"
  | "Hard"
  | "Deadly"
  | "Very Deadly";

export interface EncounterDifficulty {
  Tier: EncounterDifficultyTier;
  MonsterLevelTotal: number;
  HeroLevelTotal: number;
}

// Nimble's rulebook only gives anchor points for each tier (Easy <50%,
// Medium ~75%, Hard =100%, Deadly 100-125%, Very Deadly 150%+) - these
// boundaries fill the gaps between them by rounding to the nearest of the
// five stated percentages (50/75/100/125/150), with ties rounding to the
// harder tier. See plans/private/ENCOUNTER_DIFFICULTY.md.
const getTier = (monsterLevelTotal: number, heroLevelTotal: number): EncounterDifficultyTier => {
  if (heroLevelTotal === 0) {
    return "";
  }

  const ratio = monsterLevelTotal / heroLevelTotal;
  if (ratio < 0.625) {
    return "Easy";
  }
  if (ratio < 0.875) {
    return "Medium";
  }
  if (ratio < 1.125) {
    return "Hard";
  }
  if (ratio < 1.375) {
    return "Deadly";
  }
  return "Very Deadly";
};

const sumLevels = (challenges: string[]) =>
  challenges.map(GetChallengeLevel).reduce((sum, level) => sum + level, 0);

export class DifficultyCalculator {
  /**
   * `legendaryChallenge`, when given, is the Challenge of a Legendary/Titan
   * monster in the encounter - those are calculated on their own (their
   * level against the party's average level), not folded into
   * `monsterChallenges`.
   */
  public static Calculate(
    monsterChallenges: string[],
    heroChallenges: string[],
    legendaryChallenge?: string
  ): EncounterDifficulty {
    const heroLevelTotal = sumLevels(heroChallenges);

    if (legendaryChallenge !== undefined) {
      const legendaryLevel = GetChallengeLevel(legendaryChallenge);
      const averageHeroLevel =
        heroChallenges.length === 0 ? 0 : heroLevelTotal / heroChallenges.length;
      return {
        Tier: getTier(legendaryLevel, averageHeroLevel),
        MonsterLevelTotal: legendaryLevel,
        HeroLevelTotal: heroLevelTotal
      };
    }

    const monsterLevelTotal = sumLevels(monsterChallenges);

    return {
      Tier: getTier(monsterLevelTotal, heroLevelTotal),
      MonsterLevelTotal: monsterLevelTotal,
      HeroLevelTotal: heroLevelTotal
    };
  }
}

// Heroes are typically added to the tracker before monsters, so the hero
// total reads first (e.g. "Easy 4/0" for 4 level-1 heroes with no
// monsters added yet) - the monster total fills in as the encounter is
// built out.
export function FormatEncounterDifficulty(difficulty: EncounterDifficulty): string {
  if (!difficulty.Tier) {
    return `${difficulty.MonsterLevelTotal}`;
  }
  return `${difficulty.Tier} ${difficulty.HeroLevelTotal}/${difficulty.MonsterLevelTotal}`;
}

// From Nimble's Combat Encounter Guidelines - see
// plans/private/ENCOUNTER_DIFFICULTY.md.
const tierDescriptions: Record<EncounterDifficultyTier, string> = {
  "": "",
  Easy: "Heroes will lose minimal HP and resources.",
  Medium: "Heroes will get hurt but shouldn't drop to 0 HP.",
  Hard: "Heroes must use significant resources; some may drop to 0 HP, but none should die barring poor tactics or bad luck.",
  Deadly: "Requires strategic thinking and teamwork.",
  "Very Deadly": "Extremely dangerous - heroes will almost certainly need to retreat, or die."
};

export function GetEncounterDifficultyTooltip(difficulty: EncounterDifficulty): string {
  const totals = `Heroes: ${difficulty.HeroLevelTotal}, Monsters: ${difficulty.MonsterLevelTotal}`;
  const description = tierDescriptions[difficulty.Tier];
  return description ? `${totals} — ${description}` : totals;
}
