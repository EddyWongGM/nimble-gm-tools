import * as Color from "color";
import {
  PlayerViewCustomStyles,
  SceneImageFit
} from "../../common/PlayerViewSettings";

export function CSSFrom(
  customStyles: PlayerViewCustomStyles,
  temporaryBackgroundImageUrl?: string,
  temporaryBackgroundImageFit?: SceneImageFit
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
  declarations.push(StatColorCSSFrom(customStyles));
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
  ["hpIconColor", "--green"],
  ["manaColor", "--blue"],
  ["resourcesColor", "--magenta"],
  ["hitDiceColor", "--orange"],
  ["woundsColor", "--wound-red"],
  ["inventoryColor", "--parchment"],
  ["goldColor", "--gold"]
];

/**
 * Every stat-identity color (mana/resources/hit dice/wounds/inventory/gold,
 * plus HP's icon-only color) is consumed everywhere else in the app as
 * `var(--blue)`/`var(--magenta)`/etc, so overriding those custom properties
 * here is enough to recolor every location that reads them (buttons.less'
 * temp-apply icons and the encounter toolbar's gold/inventory buttons,
 * statblock.less' stat labels, combatants.less' resource bars, and the
 * inline `var(--x)` strings in ToPlayerViewCombatantState.ts/CombatantRow.tsx)
 * without editing any of those locations individually - see
 * plans/private/COLOR_CUSTOMIZATION.md "Where this needs to plug in".
 *
 * `.combatant--header` (both column-header bars) and `.c-toolbar` (the
 * encounter/combatant command bars, including the apply-temporary-*
 * buttons) each pin their own copies of these same custom properties to
 * fixed dark-mode values, "so the icons read the same regardless of site
 * theme" (see the comments in combatants.less and colors.less) - each needs
 * its own override alongside :root, confirmed by browser testing: a plain
 * :root override alone left apply-temporary-hp's icon on the old fixed
 * value because :root[data-theme="dark"] in colors.less out-specifies a
 * bare :root rule, and .c-toolbar sets --green directly on itself rather
 * than inheriting it.
 */
export function StatColorCSSFrom(customStyles: PlayerViewCustomStyles): string {
  const overrides = STAT_COLOR_CSS_VARS.filter(
    ([field]) => customStyles[field]
  ).map(([field, cssVar]) => `${cssVar}: ${customStyles[field]};`);
  if (!overrides.length) {
    return "";
  }
  const declarationBlock = overrides.join(" ");
  return (
    `:root { ${declarationBlock} } ` +
    `.combatant--header { ${declarationBlock} } ` +
    `.c-toolbar { ${declarationBlock} }`
  );
}
