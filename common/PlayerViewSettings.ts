export enum HpVerbosityOption {
  ActualHP = "Actual HP",
  ColoredLabel = "Colored Label",
  MonochromeLabel = "Monochrome Label",
  DamageTaken = "Damage Taken",
  HideAll = "Hide All"
}

export interface PlayerViewSettings {
  ActiveCombatantOnTop: boolean;
  AllowPlayerSuggestions: boolean;
  AllowTagSuggestions: boolean;
  MonsterHPVerbosity: HpVerbosityOption;
  PlayerHPVerbosity: HpVerbosityOption;
  HideMonstersOutsideEncounter: boolean;
  HideInventoryNumbers: boolean;
  HideGoldNumbers: boolean;
  HideManaNumbers: boolean;
  HideResourcesNumbers: boolean;
  HideHitDiceNumbers: boolean;
  HideWoundsNumbers: boolean;
  DarkMode: boolean;
  DisplayRoundCounter: boolean;
  DisplayTurnTimer: boolean;
  DisplayPortraits: boolean;
  DisplayCombatantColor: boolean;
  DisplayReactionTracker: boolean;
  SplashPortraits: boolean;
  CustomCSS: string;
  CustomStyles: PlayerViewCustomStyles;
  CustomEncounterId: string;
  SceneLibrary: SavedScene[];
}

/** CSS background-size keyword: "cover" fills the screen and crops overflow, "contain" shows the whole image and may letterbox. */
export type SceneImageFit = "cover" | "contain";

export interface SavedScene {
  Id: string;
  Name: string;
  ImageUrl: string;
  /** Optional DM-facing folder, independent of where the image is hosted. Slash-delimited segments (e.g. "Tomb of Annihilation/LV 2 Cellar") nest. */
  Path?: string;
  Fit?: SceneImageFit;
}

/**
 * Past this many saved scenes, the picker warns (but doesn't block) so the
 * list stays easy to browse.
 */
export const SCENE_LIBRARY_SOFT_CAP = 20;

export interface PlayerViewCustomStyles {
  mainBackground: string;
  combatantBackground: string;
  combatantText: string;
  activeCombatantIndicator: string;
  headerBackground: string;
  headerText: string;
  backgroundUrl: string;
  font: string;
  /**
   * Epic Tier stat identity colors. Empty string means "use the fixed
   * default" (--green/--blue/--magenta/--orange/--wound-red/--parchment/
   * --gold) - see plans/private/COLOR_CUSTOMIZATION.md. hpIconColor is the
   * only one of these with no matching value-color field: HP's value stays
   * the hardcoded severity gradient (GetHPColor), never GM-colorable.
   */
  hpIconColor: string;
  manaColor: string;
  resourcesColor: string;
  hitDiceColor: string;
  woundsColor: string;
  inventoryColor: string;
  goldColor: string;
}
