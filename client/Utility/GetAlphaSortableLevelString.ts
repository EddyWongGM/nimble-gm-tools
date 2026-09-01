import * as _ from "lodash";

const FractionLevels: Record<string, number> = {
  "1/8": 0.125,
  "1/4": 0.25,
  "1/2": 0.5
};

export function GetAlphaSortableLevelString(level: string) {
  if (level?.toLowerCase() == "minion") return "0000";

  const numericLevel =
    level in FractionLevels ? FractionLevels[level] : parseFloat(level);

  if (!isNaN(numericLevel)) {
    return "1" + _.padStart(Math.round(numericLevel * 8).toString(), 6, "0");
  }

  return "9999" + level;
}
