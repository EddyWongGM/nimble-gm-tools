import { env } from "../Environment";
import { CurrentSettings } from "../Settings/Settings";
import { Command } from "./Command";
import { EncounterCommander } from "./EncounterCommander";

export const BuildEncounterCommandList = (
  c: EncounterCommander,
  saveEncounterFn: () => void
): Command[] =>
  [
    new Command({
      id: "toggle-menu",
      description: "Toggle Wide Menu",
      actionBinding: c.ToggleToolbarWidth,
      fontAwesomeIcon: "chevron-right",
      lockOnActionBar: true
    }),
    // new Command({
    //   id: "start-encounter",
    //   description: "Start Encounter",
    //   actionBinding: c.StartEncounter,
    //   fontAwesomeIcon: "play",
    //   defaultShowOnActionBar: false
    // }),
    // new Command({
    //   id: "reroll-initiative",
    //   description: "Reroll Initiative",
    //   actionBinding: c.RerollInitiative,
    //   fontAwesomeIcon: "sync",
    //   defaultShowOnActionBar: false
    // }),
    new Command({
      id: "group-all-monsters",
      description: "Group Monsters",
      actionBinding: c.GroupAllMonsters,
      fontAwesomeIcon: "object-group",
      defaultShowOnActionBar: false
    }),
    new Command({
      id: "swap-phase-order",
      description: "Swap Phase Order",
      actionBinding: c.SwapPhaseOrder,
      fontAwesomeIcon: "exchange-alt"
    }),
    new Command({
      id: "toggle-all-monsters-hidden",
      description: "Hide/Reveal All Monsters",
      actionBinding: c.ToggleAllMonstersHidden,
      fontAwesomeIcon: "eye-slash"
    }),
    new Command({
      id: "toggle-hide-inventory-player-view",
      description: "Hide/Reveal Inventory from Players",
      actionBinding: c.ToggleHideInventoryFromPlayers,
      fontAwesomeIcon: "scroll",
      isActive: () => CurrentSettings().PlayerView.HideInventoryNumbers,
      defaultShowOnActionBar: false
    }),
    new Command({
      id: "toggle-hide-gold-player-view",
      description: "Hide/Reveal Gold from Players",
      actionBinding: c.ToggleHideGoldFromPlayers,
      fontAwesomeIcon: "coins",
      isActive: () => CurrentSettings().PlayerView.HideGoldNumbers,
      defaultShowOnActionBar: false
    }),
    // new Command({
    //   id: "end-encounter",
    //   description: "End Encounter",
    //   actionBinding: c.EndEncounter,
    //   fontAwesomeIcon: "stop",
    //   defaultShowOnActionBar: false
    // }),
    new Command({
      id: "clear-encounter",
      description: "Clear Encounter",
      actionBinding: c.ClearEncounter,
      fontAwesomeIcon: "trash",
      defaultShowOnActionBar: false
    }),
    new Command({
      id: "clean-encounter",
      description: "Clean Encounter",
      actionBinding: c.CleanEncounter,
      fontAwesomeIcon: "broom"
    }),
    new Command({
      id: "open-library",
      description: "Library Reference Pane",
      actionBinding: c.ShowLibraries,
      fontAwesomeIcon: "book-medical"
    }),
    new Command({
      id: "open-library-manager",
      description: "Library Manager",
      actionBinding: c.ToggleLibraryManager,
      fontAwesomeIcon: "book-open"
    }),
    new Command({
      id: "roll-dice",
      description: "Roll Dice",
      actionBinding: c.PromptRollDice,
      fontAwesomeIcon: "dice",
      defaultShowOnActionBar: false
    }),
    new Command({
      id: "quick-add",
      description: "Quick Add Combatant",
      actionBinding: c.QuickAddStatBlock,
      fontAwesomeIcon: "bolt",
      defaultShowOnActionBar: false
    }),
    new Command({
      id: "restore-all-player-character-hp",
      description: "Restore all Player Hero HP",
      actionBinding: c.RestoreAllPlayerCharacterHP,
      fontAwesomeIcon: "clinic-medical",
      defaultShowOnActionBar: false
    }),
    new Command({
      id: "player-window",
      description: "Launch Player View",
      actionBinding: c.LaunchPlayerView,
      fontAwesomeIcon: "users"
    }),
    typeof document.documentElement.requestFullscreen == "function" &&
      new Command({
        id: "toggle-full-screen",
        description: "Toggle Full Screen",
        actionBinding: c.ToggleFullScreen,
        fontAwesomeIcon: "expand",
        defaultShowOnActionBar: false
      }),
    // new Command({
    //   id: "next-turn",
    //   description: "Next Turn",
    //   actionBinding: c.NextTurn,
    //   fontAwesomeIcon: "step-forward",
    //   defaultShowOnActionBar: false
    // }),
    // new Command({
    //   id: "previous-turn",
    //   description: "Previous Turn",
    //   actionBinding: c.PreviousTurn,
    //   fontAwesomeIcon: "step-backward",
    //   defaultShowOnActionBar: false
    // }),
    new Command({
      id: "save-encounter",
      description: "Save Encounter",
      actionBinding: saveEncounterFn,
      fontAwesomeIcon: "save"
    }),
    new Command({
      id: "settings",
      description: "Settings",
      actionBinding: c.ShowSettings,
      fontAwesomeIcon: "cog",
      lockOnActionBar: true
    }),
    env.CanShutdownServer &&
      new Command({
        id: "shutdown-server",
        description: "Shut Down Server",
        actionBinding: c.ShutdownServer,
        fontAwesomeIcon: "power-off",
        defaultShowOnActionBar: false
      })
  ].filter(c => c) as Command[];
