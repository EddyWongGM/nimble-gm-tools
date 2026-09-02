import { CombatantCommander } from "./CombatantCommander";
import { Command } from "./Command";

export const BuildCombatantCommandList: (
  c: CombatantCommander
) => Command[] = c => [
  new Command({
    id: "set-alias",
    description: "Rename",
    actionBinding: c.SetAlias,
    fontAwesomeIcon: "i-cursor"
  }),
  new Command({
    id: "apply-damage",
    description: "Apply Damage",
    actionBinding: c.ApplyDamage,
    fontAwesomeIcon: "fist-raised",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "apply-healing",
    description: "Apply Healing",
    actionBinding: c.ApplyHealing,
    fontAwesomeIcon: "heart",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "apply-temporary-hp",
    description: "Apply Temporary HP",
    actionBinding: c.AddTemporaryHP,
    fontAwesomeIcon: "heart"
  }),
  new Command({
    id: "spend-mana",
    description: "Spend Mana",
    actionBinding: c.SpendMana,
    fontAwesomeIcon: "tint",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "restore-mana",
    description: "Restore Mana",
    actionBinding: c.RestoreMana,
    fontAwesomeIcon: "star",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "apply-temporary-mana",
    description: "Apply Temporary Mana",
    actionBinding: c.AddTemporaryMana,
    fontAwesomeIcon: "tint",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "spend-resources",
    description: "Spend Resources",
    actionBinding: c.SpendResources,
    fontAwesomeIcon: "bolt",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "restore-resources",
    description: "Restore Resources",
    actionBinding: c.RestoreResources,
    fontAwesomeIcon: "redo",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "apply-temporary-resources",
    description: "Apply Temporary Resources",
    actionBinding: c.AddTemporaryResources,
    fontAwesomeIcon: "bolt",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "spend-hit-dice",
    description: "Spend Hit Die",
    actionBinding: c.SpendHitDice,
    fontAwesomeIcon: "dice-d6",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "restore-hit-dice",
    description: "Restore Hit Die",
    actionBinding: c.RestoreHitDice,
    fontAwesomeIcon: "bed",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "apply-temporary-hit-dice",
    description: "Apply Temporary Hit Dice",
    actionBinding: c.AddTemporaryHitDice,
    fontAwesomeIcon: "dice-d6",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "spend-wounds",
    description: "Add Wounds",
    actionBinding: c.SpendWounds,
    fontAwesomeIcon: "skull",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "restore-wounds",
    description: "Heal Wounds",
    actionBinding: c.RestoreWounds,
    fontAwesomeIcon: "band-aid",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "apply-temporary-wounds",
    description: "Apply Wound Protection",
    actionBinding: c.AddTemporaryWounds,
    fontAwesomeIcon: "skull",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "add-gold",
    description: "Add Gold",
    actionBinding: c.AddGold,
    fontAwesomeIcon: "hand-holding-usd",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "subtract-gold",
    description: "Subtract Gold",
    actionBinding: c.SubtractGold,
    fontAwesomeIcon: "coins",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "add-tag",
    description: "Add Tag",
    actionBinding: c.AddTag,
    fontAwesomeIcon: "tag",
    defaultShowOnActionBar: false,
    defaultShowInCombatantRow: true
  }),
  new Command({
    id: "update-notes",
    description: "Update Persistent Notes",
    actionBinding: c.UpdateNotes,
    fontAwesomeIcon: "file-alt",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "remove",
    description: "Remove from Encounter",
    actionBinding: c.Remove,
    fontAwesomeIcon: "times"
  }),
  new Command({
    id: "toggle-reaction",
    description: "Toggle Spent Reaction",
    actionBinding: c.ToggleSpentReaction,
    fontAwesomeIcon: "reply",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "toggle-hidden",
    description: "Hide/Reveal in Player View",
    actionBinding: c.ToggleHidden,
    fontAwesomeIcon: "eye",
    defaultShowOnActionBar: false,
    defaultShowInCombatantRow: true
  }),
  new Command({
    id: "toggle-keep-hidden",
    description: "Lock Hidden (ignore Reveal All Monsters)",
    actionBinding: c.ToggleKeepHidden,
    fontAwesomeIcon: "lock",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "toggle-reveal-ac",
    description: "Reveal/Hide AC in Player View",
    actionBinding: c.ToggleRevealedAC,
    fontAwesomeIcon: "shield-alt",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "toggle-reveal-hit-dice",
    description: "Hide/Reveal Hit Dice in Player View",
    actionBinding: c.ToggleRevealedHitDice,
    fontAwesomeIcon: "dice-d6",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "show-inventory",
    description: "Show/Hide Inventory in Player View Popup",
    actionBinding: () => c.ToggleInventoryDisplayToPlayers(),
    fontAwesomeIcon: "scroll",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "add-item",
    description: "Add Item",
    actionBinding: c.AddItem,
    fontAwesomeIcon: "box-open",
    defaultShowOnActionBar: false
  }),
  new Command({
    id: "edit-statblock",
    description: "Create Unique Monster",
    actionBinding: c.EditOwnStatBlock,
    fontAwesomeIcon: "edit",
    defaultShowOnActionBar: true
  }),
  new Command({
    id: "quick-edit-statblock",
    description: "Quick Edit Combatant",
    actionBinding: c.QuickEditOwnStatBlock,
    fontAwesomeIcon: "magic",
    defaultShowOnActionBar: true
  }),
  // new Command({
  //   id: "set-initiative",
  //   description: "Edit Initiative",
  //   actionBinding: c.EditInitiative,
  //   fontAwesomeIcon: "stopwatch",
  //   defaultShowOnActionBar: false
  // }),
  // new Command({
  //   id: "move-down",
  //   description: "Move Down",
  //   actionBinding: c.MoveDown,
  //   fontAwesomeIcon: "angle-double-down",
  //   defaultShowOnActionBar: false
  // }),
  // new Command({
  //   id: "move-up",
  //   description: "Move Up",
  //   actionBinding: c.MoveUp,
  //   fontAwesomeIcon: "angle-double-up",
  //   defaultShowOnActionBar: false
  // }),
  // new Command({
  //   id: "select-next",
  //   description: "Select Next",
  //   actionBinding: c.SelectNext,
  //   fontAwesomeIcon: "arrow-down",
  //   defaultShowOnActionBar: false
  // }),
  // new Command({
  //   id: "select-previous",
  //   description: "Select Previous",
  //   actionBinding: c.SelectPrevious,
  //   fontAwesomeIcon: "arrow-up",
  //   defaultShowOnActionBar: false
  // }),
  new Command({
    id: "duplicate-combatant",
    description: "Duplicate Combatant",
    actionBinding: c.Duplicate,
    fontAwesomeIcon: "clone",
    defaultShowOnActionBar: false
  })
];
