import { CommandSetting } from "./CommandSetting";
import { HpVerbosityOption, PlayerViewSettings } from "./PlayerViewSettings";

export enum AutoGroupInitiativeOption {
  None = "None",
  ByName = "By Name",
  SideInitiative = "Side Initiative"
}

export enum AutoRerollInitiativeOption {
  No = "No",
  Prompt = "Prompt",
  Automatic = "Automatic"
}

export enum PostCombatStatsOption {
  None = "None",
  EncounterViewOnly = "Encounter view only",
  PlayerViewOnly = "Player view only",
  Both = "Both"
}

export type CustomStatBlockField = {
  name: string;
  type: "string";
  showInEncounterView: boolean;
  defaultValue: string;
  combatantRowHeader?: string;
  combatantRowWidth?: number;
};

export interface Settings {
  Commands: CommandSetting[];
  Rules: {
    RollMonsterHp: boolean;
    EnableBossAndMinionHP: boolean;
    AllowNegativeHP: boolean;
    AutoCheckConcentration: boolean;
    AutoGroupInitiative: AutoGroupInitiativeOption;
    AutoRerollInitiative: AutoRerollInitiativeOption;
    AlwaysNumberMonsters: boolean;
    EnableInventory: boolean;
    EnableGold: boolean;
    EnableMana: boolean;
    EnableResources: boolean;
    EnableHitDice: boolean;
    EnableWounds: boolean;
  };
  TrackerView: {
    DarkMode: boolean;
    DisplayPortraits: boolean;
    DisplayRoundCounter: boolean;
    DisplayTurnTimer: boolean;
    DisplayDifficulty: boolean;
    DisplayHPBar: boolean;
    DisplayCombatantColor: boolean;
    DisplayReactionTracker: boolean;
    PostCombatStats: PostCombatStatsOption;
    DisplayRestoreCombatants: boolean;
    HideRollableUnderline: boolean;
  };
  PlayerView: PlayerViewSettings;
  StatBlock: {
    CustomFields: CustomStatBlockField[];
  };
  PreloadedStatBlockSources: Record<string, boolean | undefined>;
  PreloadedSpellSources: Record<string, boolean | undefined>;
  PreloadedHeroSources: Record<string, boolean | undefined>;
  PreloadedEncounterSources: Record<string, boolean | undefined>;
  RecentItemIds: string[];
  Version: string;
}

export function getDefaultSettings(): Settings {
  return {
    Commands: [],
    Rules: {
      RollMonsterHp: false,
      EnableBossAndMinionHP: false,
      AllowNegativeHP: false,
      AutoCheckConcentration: true,
      AutoGroupInitiative: AutoGroupInitiativeOption.None,
      AutoRerollInitiative: AutoRerollInitiativeOption.No,
      AlwaysNumberMonsters: true,
      EnableInventory: false,
      EnableGold: false,
      EnableMana: false,
      EnableResources: false,
      EnableHitDice: false,
      EnableWounds: false
    },
    TrackerView: {
      DarkMode: false,
      DisplayPortraits: false,
      DisplayRoundCounter: false,
      DisplayTurnTimer: false,
      DisplayDifficulty: true,
      DisplayHPBar: false,
      DisplayCombatantColor: false,
      DisplayReactionTracker: false,
      PostCombatStats: PostCombatStatsOption.None,
      DisplayRestoreCombatants: true,
      HideRollableUnderline: true
    },
    PlayerView: {
      ActiveCombatantOnTop: false,
      AllowPlayerSuggestions: false,
      AllowTagSuggestions: false,
      MonsterHPVerbosity: HpVerbosityOption.ColoredLabel,
      PlayerHPVerbosity: HpVerbosityOption.ActualHP,
      HideMonstersOutsideEncounter: false,
      HideInventoryNumbers: false,
      HideGoldNumbers: false,
      HideManaNumbers: false,
      HideResourcesNumbers: false,
      HideHitDiceNumbers: false,
      HideWoundsNumbers: false,
      DarkMode: false,
      DisplayRoundCounter: false,
      DisplayTurnTimer: false,
      DisplayPortraits: false,
      DisplayCombatantColor: false,
      DisplayReactionTracker: false,
      SplashPortraits: false,
      CustomCSS: "",
      CustomStyles: {
        combatantBackground: "",
        combatantText: "",
        activeCombatantIndicator: "",
        font: "",
        headerBackground: "",
        headerText: "",
        mainBackground: "",
        backgroundUrl: ""
      },
      CustomEncounterId: "",
      SceneLibrary: []
    },
    StatBlock: {
      CustomFields: []
    },
    PreloadedStatBlockSources: {
      "local-basic-rules": true,
      "monster-builder-set": true
    },
    PreloadedSpellSources: { "local-basic-rules": true },
    PreloadedHeroSources: {
      "local-basic-rules": false,
      "heroes-tutorial-set": true
    },
    PreloadedEncounterSources: { "local-basic-rules": true },
    RecentItemIds: [],
    Version: process.env.VERSION || "0.0.0"
  };
}
