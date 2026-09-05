import * as Color from "color";
import {
  PlayerViewCustomStyles,
  SceneImageFit
} from "../../common/PlayerViewSettings";

export function CSSFrom(
  customStyles: PlayerViewCustomStyles,
  temporaryBackgroundImageUrl?: string,
  temporaryBackgroundImageFit?: SceneImageFit,
  hasEpicInitiative?: boolean
): string {
  const declarations: string[] = [];
  if (customStyles.combatantText) {
    declarations.push(`li.combatant { color: ${customStyles.combatantText}; }`);
  }
  if (customStyles.combatantBackground) {
    const baseColor = Color(customStyles.combatantBackground);
    let zebraColor = "",
      activeColor = "";
    if (baseColor.isDark()) {
      zebraColor = baseColor.lighten(0.1).string();
      activeColor = baseColor.lighten(0.2).string();
    } else {
      zebraColor = baseColor.darken(0.1).string();
      activeColor = baseColor.darken(0.2).string();
    }
    declarations.push(
      `.combatant { background-color: ${customStyles.combatantBackground}; }`
    );
    declarations.push(
      `.combatant:nth-child(2n-1) { background-color: ${zebraColor}; }`
    );
    declarations.push(
      `.combatant.active { background-color: ${activeColor}; }`
    );
  }
  if (customStyles.activeCombatantIndicator) {
    declarations.push(
      `.combatant.active { border-color: ${customStyles.activeCombatantIndicator} }`
    );
  }
  if (customStyles.headerText) {
    declarations.push(
      `.combatant--header, .combat-footer { color: ${customStyles.headerText}; }`
    );
  }
  if (customStyles.headerBackground) {
    declarations.push(
      `.combatant--header, .combat-footer { background-color: ${customStyles.headerBackground}; border-color: ${customStyles.headerBackground} }`
    );
  }
  if (customStyles.mainBackground) {
    declarations.push(
      `#playerview, #playerview.dark-mode { background-color: ${customStyles.mainBackground}; }`
    );
    if (!customStyles.backgroundUrl) {
      declarations.push(
        `#playerview, #playerview.dark-mode { background-image: none; }`
      );
    }
  }
  if (temporaryBackgroundImageUrl || customStyles.backgroundUrl) {
    declarations.push(
      `#playerview, #playerview.dark-mode { background-image: url(${
        temporaryBackgroundImageUrl || customStyles.backgroundUrl
      }); }`
    );
    if (temporaryBackgroundImageUrl) {
      declarations.push(
        `#playerview, #playerview.dark-mode { background-size: ${temporaryBackgroundImageFit || "cover"}; }`
      );
    }
  }
  if (customStyles.font) {
    declarations.push(`* { font-family: "${customStyles.font}", sans-serif; }`);
  }
  declarations.push(StatColorCSSFrom(customStyles, hasEpicInitiative));
  return declarations.join(" ");
}

export type StatColorField =
  | "hpIconColor"
  | "manaColor"
  | "resourcesColor"
  | "hitDiceColor"
  | "woundsColor"
  | "inventoryColor"
  | "goldColor";

export const STAT_COLOR_CSS_VARS: [StatColorField, string][] = [
  ["hpIconColor", "--stat-hp"],
  ["manaColor", "--stat-mana"],
  ["resourcesColor", "--stat-resources"],
  ["hitDiceColor", "--stat-hitdice"],
  ["woundsColor", "--stat-wounds"],
  ["inventoryColor", "--stat-inventory"],
  ["goldColor", "--stat-gold"]
];

/**
 * Every stat-identity color (mana/resources/hit dice/wounds/inventory/gold,
 * plus HP's icon-only color) is consumed everywhere else in the app as
 * `var(--stat-mana)`/`var(--stat-resources)`/etc, so overriding those custom
 * properties here is enough to recolor every location that reads them
 * (buttons.less' temp-apply icons, statblock.less' stat labels,
 * combatants.less' resource bars, and the inline `var(--stat-x)` strings in
 * ToPlayerViewCombatantState.ts/CombatantRow.tsx/InitiativeListHeader.tsx/
 * PlayerViewCombatantHeader.tsx) without editing any of those locations
 * individually - see plans/private/COLOR_CUSTOMIZATION.md "Where this needs
 * to plug in".
 *
 * These are dedicated `--stat-*` aliases (defined once in colors.less,
 * pointing at --green/--blue/etc by default), deliberately NOT the same
 * `--green`/`--blue`/`--magenta`/`--orange`/`--wound-red`/`--gold`/
 * `--parchment` custom properties used elsewhere in the design system for
 * unrelated generic UI - `--text-link`, `--button-face-green` ("Opt In",
 * "Repeat Tutorial"), `.c-button--active`'s generic blue, the statblock
 * save-triangle's win/lose triangles, the "last stand" bar indicator, etc.
 * The first version of this feature overrode `--green`/`--blue` directly
 * and recolored/neutralized all of those unrelated elements as a side
 * effect - confirmed live ("Opt In"/"Repeat Tutorial" going black with a
 * green hover, since :root's override left --green-bright's hover face
 * untouched). Only ever touch the --stat-* aliases here, never the hue
 * vars directly.
 *
 * `.combatant--header` (both column-header bars) and `.c-toolbar` (the
 * encounter/combatant command bars, including the apply-temporary-*
 * buttons) each pin their own copies of the underlying hue vars to fixed
 * dark-mode values, "so the icons read the same regardless of site theme"
 * (see the comments in combatants.less and colors.less) - `--stat-*`'s
 * live var() reference already resolves through that pinned value for the
 * unset case (Epic Tier, nothing customized), but once a field IS set
 * (customized or neutralized), it must be declared again at each of these
 * two selectors, not just :root - a plain :root-only override left
 * apply-temporary-hp's icon on the old fixed value, confirmed by browser
 * testing, because :root[data-theme="dark"] in colors.less out-specifies
 * a bare :root rule and .c-toolbar sets its pinned hue var directly on
 * itself rather than inheriting it.
 *
 * Below Epic Tier, stat colors are neutralized entirely rather than left
 * on their fixed colorful defaults - color is the Epic Tier perk, not just
 * customizing it. Any leftover customStyles values (e.g. from a Patreon
 * downgrade before resetEpicInitiativeSettings runs) are ignored in that
 * case, not just unset fields. The neutral value differs by selector:
 * `.combatant--header`/`.c-toolbar` are always a black bar regardless of
 * site theme, so they need a fixed `var(--white)` - the same theme-relative
 * `var(--text-face)` used at :root would resolve to black in light mode,
 * i.e. a black icon on that always-black bar (confirmed live).
 */
export function StatColorCSSFrom(
  customStyles: PlayerViewCustomStyles,
  hasEpicInitiative?: boolean
): string {
  const declarationBlock = (neutralValue: string) =>
    hasEpicInitiative
      ? STAT_COLOR_CSS_VARS.filter(([field]) => customStyles[field])
          .map(([field, cssVar]) => `${cssVar}: ${customStyles[field]};`)
          .join(" ")
      : STAT_COLOR_CSS_VARS.map(
          ([, cssVar]) => `${cssVar}: ${neutralValue};`
        ).join(" ");

  const rootBlock = declarationBlock("var(--text-face)");
  const blackBarBlock = declarationBlock("var(--white)");
  if (!rootBlock && !blackBarBlock) {
    return "";
  }
  return (
    `:root { ${rootBlock} } ` +
    `.combatant--header { ${blackBarBlock} } ` +
    `.c-toolbar { ${blackBarBlock} }`
  );
}
