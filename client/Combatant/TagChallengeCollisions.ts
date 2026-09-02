import {
  GetChallengeSuffix,
  IsNumericChallenge
} from "../Utility/GetChallengeSuffix";
import { Combatant } from "./Combatant";
import { Tag } from "./Tag";

/**
 * When a same-named combatant already exists in the encounter at a
 * different Challenge, tags every colliding combatant - the one just
 * added and the pre-existing one(s) - with a Challenge hint, so the GM
 * (and, for anyone reasoning about combat threat, the players) can tell
 * them apart. A numeric/fraction Challenge ("LV 2") is meta-game info and
 * stays GM-only; a word-based one ("Minion") is usually already apparent
 * at the table, so that tag is revealed to players.
 */
export function TagChallengeCollisions(
  combatant: Combatant,
  allCombatants: Combatant[]
): void {
  const name = combatant.StatBlock().Name;
  const challenge = combatant.StatBlock().Challenge;

  const colliders = allCombatants.filter(
    c =>
      c !== combatant &&
      c.StatBlock().Name === name &&
      c.StatBlock().Challenge !== challenge
  );

  if (colliders.length === 0) {
    return;
  }

  for (const c of [combatant, ...colliders]) {
    const cChallenge = c.StatBlock().Challenge;
    const suffix = GetChallengeSuffix(c.StatBlock().Name, cChallenge);
    if (!suffix) {
      continue;
    }
    const alreadyTagged = c.Tags().some(t => t.Text === suffix);
    if (!alreadyTagged) {
      c.Tags.push(new Tag(suffix, c, IsNumericChallenge(cChallenge)));
    }
  }
}
